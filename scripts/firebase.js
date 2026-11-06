const firebaseConfig = {
	apiKey: "MT_REPLACE_WITH_FIREBASE_API_KEY",
	appId: "MT_REPLACE_WITH_FIREBASE_APP_ID",
	authDomain: "MT_REPLACE_WITH_FIREBASE_PROJECT_ID.firebaseapp.com",
	measurementId: "MT_REPLACE_WITH_FIREBASE_MEASUREMENT_ID",
	messagingSenderId: "MT_REPLACE_WITH_FIREBASE_MESSAGING_SENDER_ID",
	projectId: "MT_REPLACE_WITH_FIREBASE_PROJECT_ID",
	storageBucket: "MT_REPLACE_WITH_FIREBASE_PROJECT_ID.firebasestorage.app",
};

async function initializeAnalytics() {
	if (firebaseConfig.apiKey.startsWith("MT_REPLACE_WITH_")) {
		console.info("Firebase Analytics disabled: deploy-time configuration has not been injected.");
		return;
	}

	try {
		if (Object.values(firebaseConfig).some((value) => !value || value.startsWith("MT_REPLACE_WITH_"))) {
			throw new Error("Firebase configuration is incomplete.");
		}

		const [{ initializeApp }, { getAnalytics, isSupported }] = await Promise.all([
			import("https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js"),
			import("https://www.gstatic.com/firebasejs/13.2.0/firebase-analytics.js"),
		]);

		if (!await isSupported()) {
			console.warn("Firebase Analytics is not supported in this browser.");
			return;
		}

		const app = initializeApp(firebaseConfig);
		getAnalytics(app);
	} catch (error) {
		console.error("Could not initialize Firebase Analytics", error);
	}
}

initializeAnalytics();
