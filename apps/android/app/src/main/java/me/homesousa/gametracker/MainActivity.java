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
 * A app inteira: uma WebView com o GameTracker Vault do servidor do utilizador.
 *
 * No primeiro arranque mostra o ecrã local "Ligar ao servidor" (assets/setup.html),
 * confirma o endereço em /api/health (ou /health) e guarda-o. Daí em diante abre
 * logo o servidor. Os links do próprio servidor ficam na app; os outros (YouTube,
 * IGDB, Twitch, Anthropic…) abrem no browser. Sem ligação, mostra
 * assets/offline.html com "Tentar outra vez" e "Mudar de servidor".
 */
public class MainActivity extends Activity {

    private static final String PREFS = "gametracker";
    private static final String KEY_SERVER = "server_url";
    // O último servidor usado, para o ecrã "Ligar ao servidor" vir preenchido depois
    // de "Mudar de servidor"
    private static final String KEY_LAST_SERVER = "last_server_url";
    private static final String SETUP_PAGE = "file:///android_asset/setup.html";
    private static final String OFFLINE_PAGE = "file:///android_asset/offline.html";
    // A cor de fundo da app (noite): por trás das barras do sistema
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

        // Android 15 desenha a app por trás das barras do sistema: o conteúdo fica
        // entre elas (e acima do teclado)
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            int types = WindowInsets.Type.systemBars() | WindowInsets.Type.ime() | WindowInsets.Type.displayCutout();
            android.graphics.Insets bars = insets.getInsets(types);
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsets.CONSUMED;
        });

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        // target=_blank abre na mesma vista e passa pelo shouldOverrideUrlLoading
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

        // Há uma versão nova da app no servidor? (uma vez por arranque)
        updater.check(prefs.getString(KEY_SERVER, null), false);
    }

    /** O servidor guardado, ou o ecrã para escolher um. */
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
        // A sessão (cookie) fica gravada mesmo que o Android feche a app
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

    // --- Navegação ----------------------------------------------------------------------

    private class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            String scheme = uri.getScheme();
            if ("file".equals(scheme)) return false;
            boolean web = "http".equals(scheme) || "https".equals(scheme);
            if (web && uri.getHost() != null && uri.getHost().equals(serverHost())) return false;
            // Tudo o resto (outros sites, mailto:, intent:…) vai para fora da app
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (ActivityNotFoundException ignored) {
                // nenhuma app sabe abrir isto
            }
            return true;
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            // Só a página principal: uma imagem que falha não deve tapar a app
            if (request.isForMainFrame() && !isLocalPage(request.getUrl().toString())) {
                view.loadUrl(OFFLINE_PAGE);
            }
        }
    }

    // --- Ponte com as páginas (window.GameTrackerApp) ------------------------------------

    private class Bridge {
        /** Ecrã "Ligar ao servidor": confirma o endereço e, se for válido, guarda-o e abre-o. */
        @JavascriptInterface
        public void connect(String input) {
            runOnUiThread(() -> {
                // Só o ecrã local pode mudar o servidor por aqui
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

        /** Ecrã "Sem ligação": tenta abrir o servidor outra vez. */
        @JavascriptInterface
        public void retry() {
            runOnUiThread(MainActivity.this::openStart);
        }

        /** Esquece o servidor e volta ao ecrã para escolher outro (também do menu da conta). */
        @JavascriptInterface
        public void changeServer() {
            runOnUiThread(() -> {
                prefs.edit().remove(KEY_SERVER).apply();
                webView.clearHistory();
                webView.loadUrl(SETUP_PAGE);
            });
        }

        /** O servidor guardado ou, depois de "Mudar de servidor", o último usado. */
        @JavascriptInterface
        public String currentServer() {
            String server = prefs.getString(KEY_SERVER, prefs.getString(KEY_LAST_SERVER, null));
            return server != null ? server : "";
        }

        @JavascriptInterface
        public String version() {
            return BuildConfig.VERSION_NAME;
        }

        /** O número interno da versão, para a página comparar com o APK publicado. */
        @JavascriptInterface
        public int versionCode() {
            return BuildConfig.VERSION_CODE;
        }

        /** "Procurar atualizações" na Ajuda: diz sempre o resultado. */
        @JavascriptInterface
        public void checkUpdate() {
            runOnUiThread(() -> updater.check(prefs.getString(KEY_SERVER, null), true));
        }
    }

    /** "gametracker.exemplo.pt" → "https://gametracker.exemplo.pt", sem barra no fim. */
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
     * Confirma que o endereço é um GameTracker Vault: no container o backend está
     * em /api (nginx); em desenvolvimento, na raiz.
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
                // tenta o caminho seguinte
            } finally {
                if (connection != null) connection.disconnect();
            }
        }
        // Respondeu mas não é um GameTracker Vault, ou não respondeu de todo
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
