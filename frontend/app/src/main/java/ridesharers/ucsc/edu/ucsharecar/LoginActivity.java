package ridesharers.ucsc.edu.ucsharecar;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.os.Build;
import android.support.annotation.RequiresApi;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.ImageView;
import android.widget.Toast;

import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.SignInButton;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

public class LoginActivity extends AppCompatActivity implements View.OnClickListener {

    private static final int RC_SIGN_IN = 9001;
    private static final String TAG = "UCShareCar_Login";

    private GoogleSignInClient mGoogleSignInClient;
    private BackendClient backend;

    @RequiresApi(api = Build.VERSION_CODES.LOLLIPOP)
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        ImageView logo = findViewById(R.id.imageView);

        // Make the google login button bigger
        SignInButton signInButton = findViewById(R.id.login_button);
        signInButton.setSize(SignInButton.SIZE_WIDE);
        signInButton.setOnClickListener(this);

        // Configure sign-in to request the user's ID, email address, and basic
        // profile. ID and basic profile are included in DEFAULT_SIGN_IN.
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .setHostedDomain("ucsc.edu")
                .requestEmail()
                .requestIdToken(getString(R.string.server_client_id))
                .build();
        // Build a GoogleSignInClient with the options specified by gso.
        mGoogleSignInClient = GoogleSignIn.getClient(this, gso);

        // Get the BackendClient singleton
        backend = BackendClient.getSingleton(this);

        // Configure notification channels, since this is the launch activity
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Create channel to show notifications.
            String channelId  = getString(R.string.default_notification_channel_id);
            String channelName = getString(R.string.default_notification_channel_name);
            NotificationManager notificationManager =
                    getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(new NotificationChannel(channelId,
                    channelName, NotificationManager.IMPORTANCE_LOW));
        }
    }

    @Override
    public void onStart() {
        super.onStart();

        // If we are already logged in, go straight to posts
        if (backend.hasSession()) {
            goToPostList();
            return;
        }

        // On activity start, we'll check for an existing signed in account. If there is one, we can
        // go ahead and send it straight to the server and get started.
        GoogleSignInAccount account = GoogleSignIn.getLastSignedInAccount(this);
        if (account != null) {
            handleSignInAccount(account);
        }
    }

    @Override
    public void onClick(View v) {
        switch (v.getId()) {
            case R.id.login_button:
                onClickLogin(v);
                break;
        }
    }

    public void onClickLogin(View view) {
        Log.w(TAG, "Log in button clicked; opening login activity");

        // Straightforward -- clicking the login button sets off the login stuff
        Intent signInIntent = mGoogleSignInClient.getSignInIntent();
        startActivityForResult(signInIntent, RC_SIGN_IN);
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        // Result returned from launching the Intent from GoogleSignInClient.getSignInIntent(...);
        if (requestCode == RC_SIGN_IN) {
            // The Task returned from this call is always completed, no need to attach
            // a listener.
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);

            // Now try to extract the GoogleSignInAccount variable to validate w/ server.
            final GoogleSignInAccount account;
            try {
                account = task.getResult(ApiException.class);
            } catch (ApiException e) {
                // The ApiException status code indicates the detailed failure reason.
                // Please refer to the GoogleSignInStatusCodes class reference for more information.
                Log.w(TAG, "signInResult:failed code=" + e.getStatusCode());
                dispToast("Log in failed. Try again.");
                // TODO Failed sign in route
                return;
            }

            // Deal with that sign in result elsewhere
            handleSignInAccount(account);
        }
    }

    private void handleSignInAccount(final GoogleSignInAccount account) {
        // Log in was successful at this point
        Log.w(TAG, "Got a successful login client-side from "+account.getEmail());

        // Now check it was valid with the server.
        backend.SignIn(account, new Response.Listener<BackendClient.SignInResult>() {
            @Override
            public void onResponse(BackendClient.SignInResult response) {
                if (response.Succeeded()) {
                    // Got a valid login with the server!
                    Log.w(TAG, "Successfully logged in with server");
                    dispToast("Successfully logged in " + account.getEmail());
                    goToPostList();
                }
                else if (response.needsRegister()) {
                    // The google token was valid, but the user needs to be registered.
                    Log.w(TAG, "User is not registered");
                    dispToast("You need to register");
                    startRegister();
                }
                else {
                    Log.w(TAG, "Server rejected sign in with no recourse");
                    dispToast("There was an error. You could not be signed in.");
                    // This result will probably be either one of two things.
                    // 1. The google sign in result was invalid, or
                    // 2. The user has been banned.
                    // Either way, the ball is out of our court.
                }
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                Log.w(TAG, "Error occurred when validating login: "+error);
                dispToast("Log in failed. Try again.");
            }
        });
    }

    private void startRegister() {
        Intent intent = new Intent(this, RegisterActivity.class);
        startActivity(intent);
    }

    private void goToPostList() {
        Intent intent = new Intent(this, PostListActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
    }

    private void dispToast(String message) {
        Toast.makeText(getApplicationContext(), message, Toast.LENGTH_SHORT).show();
    }
}
