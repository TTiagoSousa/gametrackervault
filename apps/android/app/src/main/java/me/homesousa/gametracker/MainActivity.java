package me.homesousa.gametracker;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * The whole app: a WebView showing GameTracker Vault from the user's server.
 *
 * On first launch it shows the local "Connect to your server" screen (assets/setup.html),
 * checks the address at /api/health (or /health) and saves it. From then on it opens
 * the server straight away. Links to the server itself stay in the app; others (YouTube,
 * IGDB, Twitch, Anthropic…) open in the browser. With no connection, it shows
 * assets/offline.html with "Try again" and "Change server".
 */
public class MainActivity extends Activity {

    private static final String PREFS = "gametracker";
    private static final String KEY_SERVER = "server_url";
    // The last server used, so the "Connect to your server" screen comes pre-filled after
    // "Change server"
    private static final String KEY_LAST_SERVER = "last_server_url";
    private static final String SETUP_PAGE = "file:///android_asset/setup.html";
    private static final String OFFLINE_PAGE = "file:///android_asset/offline.html";
    // The app's background colour (night): behind the system bars
    private static final int BACKGROUND = Color.parseColor("#0D1230");

    private WebView webView;
    private SharedPreferences prefs;
    private Updater updater;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        updater = new Updater(this);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(BACKGROUND);
        webView = new WebView(this);
        webView.setBackgroundColor(BACKGROUND);
        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);

        // Android 15 draws the app behind the system bars: the content stays
        // between them (and above the keyboard)
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            int types = WindowInsets.Type.systemBars() | WindowInsets.Type.ime() | WindowInsets.Type.displayCutout();
            android.graphics.Insets bars = insets.getInsets(types);
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsets.CONSUMED;
        });

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        // target=_blank opens in the same view and goes through shouldOverrideUrlLoading
        settings.setSupportMultipleWindows(false);
        settings.setUserAgentString(settings.getUserAgentString()
                + " GameTrackerVaultApp/" + BuildConfig.VERSION_NAME + " (Android)");

        CookieManager.getInstance().setAcceptCookie(true);

        webView.addJavascriptInterface(new Bridge(), "GameTrackerApp");
        webView.setWebViewClient(new Client());

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            openStart();
        }

        // Is there a new app version on the server? (once per launch)
        updater.check(prefs.getString(KEY_SERVER, null), false);
    }

    /** The saved server, or the screen to pick one. */
    private void openStart() {
        String server = prefs.getString(KEY_SERVER, null);
        webView.loadUrl(server != null ? server + "/" : SETUP_PAGE);
    }

    private String serverHost() {
        String server = prefs.getString(KEY_SERVER, null);
        return server != null ? Uri.parse(server).getHost() : null;
    }

    private boolean isLocalPage(String url) {
        return url != null && url.startsWith("file:///android_asset/");
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        // The session (cookie) is persisted even if Android closes the app
        CookieManager.getInstance().flush();
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (webView.canGoBack() && !isLocalPage(webView.getUrl())) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    // --- Navigation ----------------------------------------------------------------------

    private class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            String scheme = uri.getScheme();
            if ("file".equals(scheme)) return false;
            boolean web = "http".equals(scheme) || "https".equals(scheme);
            if (web && uri.getHost() != null && uri.getHost().equals(serverHost())) return false;
            // Everything else (other sites, mailto:, intent:…) goes outside the app
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (ActivityNotFoundException ignored) {
                // no app can open this
            }
            return true;
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            // Main frame only: a failing image should not cover the app
            if (request.isForMainFrame() && !isLocalPage(request.getUrl().toString())) {
                view.loadUrl(OFFLINE_PAGE);
            }
        }
    }

    // --- Bridge to the pages (window.GameTrackerApp) -------------------------------------

    private class Bridge {
        /** "Connect to your server" screen: checks the address and, if valid, saves and opens it. */
        @JavascriptInterface
        public void connect(String input) {
            runOnUiThread(() -> {
                // Only the local screen can change the server through here
                if (!isLocalPage(webView.getUrl())) return;
                new Thread(() -> {
                    String server = normalize(input);
                    String result = server == null ? "invalid" : check(server);
                    runOnUiThread(() -> {
                        if ("ok".equals(result)) {
                            prefs.edit().putString(KEY_SERVER, server).putString(KEY_LAST_SERVER, server).apply();
                            webView.clearHistory();
                            webView.loadUrl(server + "/");
                            updater.check(server, false);
                        } else {
                            webView.evaluateJavascript("window.onConnectResult && window.onConnectResult('" + result + "')", null);
                        }
                    });
                }).start();
            });
        }

        /** Offline screen: tries to open the server again. */
        @JavascriptInterface
        public void retry() {
            runOnUiThread(MainActivity.this::openStart);
        }

        /** Forgets the server and goes back to the screen to pick another (also from the account menu). */
        @JavascriptInterface
        public void changeServer() {
            runOnUiThread(() -> {
                prefs.edit().remove(KEY_SERVER).apply();
                webView.clearHistory();
                webView.loadUrl(SETUP_PAGE);
            });
        }

        /** The saved server or, after "Change server", the last one used. */
        @JavascriptInterface
        public String currentServer() {
            String server = prefs.getString(KEY_SERVER, prefs.getString(KEY_LAST_SERVER, null));
            return server != null ? server : "";
        }

        @JavascriptInterface
        public String version() {
            return BuildConfig.VERSION_NAME;
        }

        /** The internal version number, for the page to compare with the published APK. */
        @JavascriptInterface
        public int versionCode() {
            return BuildConfig.VERSION_CODE;
        }

        /** "Check for updates" in Help: always reports the result. */
        @JavascriptInterface
        public void checkUpdate() {
            runOnUiThread(() -> updater.check(prefs.getString(KEY_SERVER, null), true));
        }
    }

    /** "gametracker.exemplo.pt" → "https://gametracker.exemplo.pt", without a trailing slash. */
    private static String normalize(String input) {
        if (input == null) return null;
        String value = input.trim();
        if (value.isEmpty()) return null;
        if (!value.startsWith("http://") && !value.startsWith("https://")) value = "https://" + value;
        while (value.endsWith("/")) value = value.substring(0, value.length() - 1);
        Uri uri = Uri.parse(value);
        if (uri.getHost() == null || uri.getHost().isEmpty()) return null;
        return value;
    }

    /**
     * Checks that the address is a GameTracker Vault: in the container the backend is
     * at /api (nginx); in development, at the root.
     */
    private static String check(String server) {
        boolean reached = false;
        for (String path : new String[] {"/api/health", "/health"}) {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(server + path).openConnection();
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(8000);
                connection.setRequestProperty("Accept", "application/json");
                int status = connection.getResponseCode();
                reached = true;
                if (status != 200) continue;
                StringBuilder body = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), "UTF-8"))) {
                    String line;
                    while ((line = reader.readLine()) != null) body.append(line);
                }
                if ("gametracker-vault".equals(new JSONObject(body.toString()).optString("app"))) return "ok";
            } catch (Exception ignored) {
                // try the next path
            } finally {
                if (connection != null) connection.disconnect();
            }
        }
        // Answered but is not a GameTracker Vault, or did not answer at all
        return reached ? "not-gametracker" : "unreachable";
    }

    @Override
    protected void onDestroy() {
        if (updater != null) updater.release();
        if (webView != null) {
            webView.setWebViewClient(new WebViewClient());
            webView.destroy();
        }
        super.onDestroy();
    }
}
