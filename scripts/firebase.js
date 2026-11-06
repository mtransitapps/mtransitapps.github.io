import { consent, onConsentChange } from "./analytics-consent.js";

const firebaseConfig = {
	apiKey: "MT_REPLACE_WITH_FIREBASE_API_KEY",
	appId: "MT_REPLACE_WITH_FIREBASE_APP_ID",
	authDomain: "MT_REPLACE_WITH_FIREBASE_PROJECT_ID.firebaseapp.com",
	measurementId: "MT_REPLACE_WITH_FIREBASE_MEASUREMENT_ID",
	messagingSenderId: "MT_REPLACE_WITH_FIREBASE_MESSAGING_SENDER_ID",
	projectId: "MT_REPLACE_WITH_FIREBASE_PROJECT_ID",
	storageBucket: "MT_REPLACE_WITH_FIREBASE_PROJECT_ID.firebasestorage.app",
};

let tracking = null;
let analyticsReady = null;

async function initializeAnalytics() {
	if (firebaseConfig.apiKey.startsWith("MT_REPLACE_WITH_")) {
		console.info("Firebase Analytics disabled: deploy-time configuration has not been injected.");
		return;
	}

	try {
		if (Object.values(firebaseConfig).some((value) => !value || value.startsWith("MT_REPLACE_WITH_"))) {
			throw new Error("Firebase configuration is incomplete.");
		}

		const [{ initializeApp }, { getAnalytics, isSupported, logEvent, setConsent, setAnalyticsCollectionEnabled }] = await Promise.all([
			import("https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js"),
			import("https://www.gstatic.com/firebasejs/13.2.0/firebase-analytics.js"),
		]);

		const supported = await isSupported();
		if (consent !== "accepted") {
			return;
		}
		if (!supported) {
			console.warn("Firebase Analytics is not supported in this browser.");
			return;
		}

		const app = initializeApp(firebaseConfig);
		setConsent({
			analytics_storage: "granted",
			ad_storage: "denied",
			ad_user_data: "denied",
			ad_personalization: "denied",
		});
		tracking = { analytics: getAnalytics(app), logEvent, setAnalyticsCollectionEnabled };
		return tracking;
	} catch (error) {
		console.error("Could not initialize Firebase Analytics", error);
	}
}

onConsentChange((choice, reload = true) => {
	if (choice === "accepted") {
		if (tracking) {
			tracking.setAnalyticsCollectionEnabled(tracking.analytics, true);
		}
		if (!analyticsReady) {
			analyticsReady = initializeAnalytics();
		}
	} else if (analyticsReady) {
		if (tracking) {
			tracking.setAnalyticsCollectionEnabled(tracking.analytics, false);
		}
		if (reload) {
			// Unload the Google tag as well as our custom click handler.
			window.location.reload();
		}
	}
});

const myLocationButton = document.getElementById("my-location-btn");

if (myLocationButton) {
	myLocationButton.addEventListener("click", async () => {
		if (consent !== "accepted") {
			return;
		}
		try {
			const tracking = await analyticsReady;
			if (consent === "accepted" && tracking) {
				tracking.logEvent(tracking.analytics, "use_my_location_click");
			}
		} catch (error) {
			console.error("Could not track Use my location click", error);
		}
	});
}
