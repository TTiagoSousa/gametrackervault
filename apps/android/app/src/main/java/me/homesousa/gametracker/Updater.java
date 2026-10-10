package me.homesousa.gametracker;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInstaller;
import android.os.Build;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

/**
 * Updates the app itself from the server, without going through the browser.
 *
 * The server publishes the APK at /downloads/gametracker-vault.apk and its manifest at
 * /downloads/android.json (version, versionCode, size, sha256). On launch, the app
 * reads the manifest; if there is a higher versionCode, it asks "Update / Later".
 * When updating, it downloads the APK into a PackageInstaller session (checking the
 * sha256 along the way) and asks Android to install it. Android asks the user for
 * confirmation — except, from Android 12 on, when this app is the one that
 * installed the current version.
 */
final class Updater {

    private static final String ACTION_STATUS = "me.homesousa.gametracker.INSTALL_STATUS";

    // One prompt per app launch: "Later" holds until the app is closed
    private static boolean askedThisRun = false;

    private final Activity activity;
    private BroadcastReceiver receiver;

    Updater(Activity activity) {
        this.activity = activity;
    }

    /** Manifest of the APK published on the server. */
    private static final class Release {
        String version;
        int versionCode;
        long size;
        String sha256;
    }

    /**
     * Looks for a new version. Automatic (on launch): asks only once per launch
     * and says nothing if there is none. Manual (from Help): always reports the
     * result.
     */
    void check(String server, boolean manual) {
        if (server == null) return;
        if (!manual && askedThisRun) return;
        if (!manual) askedThisRun = true;
        new Thread(() -> {
            Release release = fetchRelease(server);
            activity.runOnUiThread(() -> {
                if (activity.isFinishing()) return;
                if (release == null) {
                    if (manual) message(activity.getString(R.string.update_unavailable));
                } else if (release.versionCode > BuildConfig.VERSION_CODE) {
                    offer(server, release);
                } else if (manual) {
                    message(activity.getString(R.string.update_latest, BuildConfig.VERSION_NAME));
                }
            });
        }).start();
    }

    private static Release fetchRelease(String server) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(server + "/downloads/android.json").openConnection();
            connection.setConnectTimeout(8000);
            connection.setReadTimeout(8000);
            connection.setUseCaches(false);
            if (connection.getResponseCode() != 200) return null;
            StringBuilder body = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), "UTF-8"))) {
                String line;
                while ((line = reader.readLine()) != null) body.append(line);
            }
            JSONObject json = new JSONObject(body.toString());
            Release release = new Release();
            release.version = json.optString("version", "?");
            release.versionCode = json.optInt("versionCode", 0);
            release.size = json.optLong("size", -1);
            release.sha256 = json.optString("sha256", "");
            return release.versionCode > 0 ? release : null;
        } catch (Exception e) {
            return null;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private void offer(String server, Release release) {
        new AlertDialog.Builder(activity)
                .setTitle(R.string.update_title)
                .setMessage(activity.getString(R.string.update_message, release.version, BuildConfig.VERSION_NAME))
                .setPositiveButton(R.string.update_now, (dialog, which) -> install(server, release))
                .setNegativeButton(R.string.update_later, null)
                .show();
    }

    private void message(String text) {
        new AlertDialog.Builder(activity).setMessage(text).setPositiveButton(android.R.string.ok, null).show();
    }

    // --- Download and install ------------------------------------------------------------

    private void install(String server, Release release) {
        ProgressBar bar = new ProgressBar(activity, null, android.R.attr.progressBarStyleHorizontal);
        bar.setMax(100);
        bar.setIndeterminate(release.size <= 0);
        TextView label = new TextView(activity);
        label.setText(R.string.update_downloading);
        LinearLayout box = new LinearLayout(activity);
        box.setOrientation(LinearLayout.VERTICAL);
        int pad = Math.round(20 * activity.getResources().getDisplayMetrics().density);
        box.setPadding(pad, pad, pad, pad / 2);
        box.addView(label);
        box.addView(bar);
        AlertDialog progress = new AlertDialog.Builder(activity).setView(box).setCancelable(false).show();

        new Thread(() -> {
            String error = null;
            PackageInstaller installer = activity.getPackageManager().getPackageInstaller();
            int sessionId = -1;
            try {
                PackageInstaller.SessionParams params =
                        new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                params.setAppPackageName(activity.getPackageName());
                if (release.size > 0) params.setSize(release.size);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    // Without asking, when Android allows it (this app installed the current one)
                    params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
                }
                sessionId = installer.createSession(params);
                try (PackageInstaller.Session session = installer.openSession(sessionId)) {
                    String digest = download(server + "/downloads/gametracker-vault.apk", session, release.size, bar);
                    if (!release.sha256.isEmpty() && !release.sha256.equalsIgnoreCase(digest)) {
                        session.abandon();
                        error = activity.getString(R.string.update_corrupt);
                    } else {
                        listenForResult();
                        Intent intent = new Intent(ACTION_STATUS).setPackage(activity.getPackageName());
                        int flags = PendingIntent.FLAG_UPDATE_CURRENT
                                | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_MUTABLE : 0);
                        PendingIntent pending = PendingIntent.getBroadcast(activity, sessionId, intent, flags);
                        session.commit(pending.getIntentSender());
                    }
                }
            } catch (Exception e) {
                if (sessionId != -1) {
                    try { installer.abandonSession(sessionId); } catch (Exception ignored) { /* already closed */ }
                }
                error = activity.getString(R.string.update_failed, e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
            }
            final String failure = error;
            activity.runOnUiThread(() -> {
                progress.dismiss();
                if (failure != null) message(failure);
            });
        }).start();
    }

    /** Copies the APK into the session, updates the bar and returns the sha256 of what arrived. */
    private String download(String url, PackageInstaller.Session session, long size, ProgressBar bar) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(30000);
        connection.setUseCaches(false);
        try {
            if (connection.getResponseCode() != 200) {
                throw new IllegalStateException("HTTP " + connection.getResponseCode());
            }
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            long total = size > 0 ? size : connection.getContentLengthLong();
            try (InputStream in = connection.getInputStream();
                 OutputStream out = session.openWrite("base.apk", 0, total > 0 ? total : -1)) {
                byte[] buffer = new byte[16 * 1024];
                long done = 0;
                int read;
                while ((read = in.read(buffer)) != -1) {
                    out.write(buffer, 0, read);
                    sha.update(buffer, 0, read);
                    done += read;
                    if (total > 0) {
                        int percent = (int) (done * 100 / total);
                        activity.runOnUiThread(() -> bar.setProgress(percent));
                    }
                }
                session.fsync(out);
            }
            StringBuilder hex = new StringBuilder();
            for (byte b : sha.digest()) hex.append(String.format("%02x", b));
            return hex.toString();
        } finally {
            connection.disconnect();
        }
    }

    /**
     * The install result arrives by broadcast. If Android needs the user's
     * confirmation, it opens its screen; if it fails, it says why. On
     * success, the app is replaced (and closed) by Android itself.
     */
    private void listenForResult() {
        if (receiver != null) return;
        receiver = new BroadcastReceiver() {
            @SuppressWarnings("deprecation") // old getParcelableExtra, only below Android 13
            @Override
            public void onReceive(Context context, Intent intent) {
                int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
                if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
                    Intent confirm = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                            ? intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent.class)
                            : intent.getParcelableExtra(Intent.EXTRA_INTENT);
                    if (confirm != null) {
                        confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        activity.startActivity(confirm);
                    }
                } else if (status != PackageInstaller.STATUS_SUCCESS && status != PackageInstaller.STATUS_FAILURE_ABORTED) {
                    String detail = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
                    message(activity.getString(R.string.update_failed, detail != null ? detail : String.valueOf(status)));
                }
            }
        };
        IntentFilter filter = new IntentFilter(ACTION_STATUS);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            activity.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            activity.registerReceiver(receiver, filter);
        }
    }

    void release() {
        if (receiver != null) {
            try { activity.unregisterReceiver(receiver); } catch (Exception ignored) { /* already unregistered */ }
            receiver = null;
        }
    }
}
