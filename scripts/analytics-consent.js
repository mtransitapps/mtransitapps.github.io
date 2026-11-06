const consentKey = "montransit.analytics-consent.v1";
const french = /\/privacy\/fr(?:\/|$)/.test(window.location.pathname);
const text = french ? {
	title: "Statistiques du site",
	description: "Autoriser les cookies statistiques pour mesurer les visites et les clics ? Vous pouvez modifier votre choix à tout moment.",
	accept: "Accepter",
	reject: "Refuser",
	settings: "Confidentialité",
	policy: "Politique de confidentialité",
	storageError: "Impossible d'enregistrer votre choix. Les statistiques restent désactivées. Vérifiez les paramètres de stockage du navigateur.",
} : {
	title: "Website analytics",
	description: "Allow analytics cookies to measure visits and clicks? You can change your choice anytime.",
	accept: "Accept",
	reject: "Reject",
	settings: "Privacy settings",
	policy: "Privacy policy",
	storageError: "Could not save your choice. Analytics remains disabled. Check your browser storage settings.",
};

export let consent = null;
try {
	const saved = localStorage.getItem(consentKey);
	if (saved === "accepted" || saved === "rejected") {
		consent = saved;
	}
} catch (error) {
	console.error("Could not read analytics consent", error);
}

let consentChangeHandler = null;

export function onConsentChange(handler) {
	consentChangeHandler = handler;
	if (consent === "accepted") {
		handler(consent);
	}
}

const style = document.createElement("link");
style.rel = "stylesheet";
style.href = new URL("../styles/analytics-consent.css", import.meta.url).href;
style.addEventListener("error", () => {
	console.error("Could not load analytics consent stylesheet", style.href);
});
document.head.append(style);

const panel = document.createElement("section");
panel.id = "analytics-consent";
panel.lang = french ? "fr" : "en";
panel.setAttribute("aria-labelledby", "analytics-consent-title");
const title = document.createElement("h2");
title.id = "analytics-consent-title";
title.textContent = text.title;
const description = document.createElement("p");
description.textContent = text.description;
const policy = document.createElement("a");
policy.href = new URL(french ? "../privacy/fr/www.html" : "../privacy/www.html", import.meta.url).href;
policy.textContent = text.policy;
const status = document.createElement("p");
status.setAttribute("role", "status");
const accept = document.createElement("button");
accept.type = "button";
accept.textContent = text.accept;
const reject = document.createElement("button");
reject.type = "button";
reject.textContent = text.reject;
const actions = document.createElement("div");
actions.className = "analytics-actions";
actions.append(accept, reject);
panel.append(title, description, policy, status, actions);
panel.hidden = consent !== null;

const settings = document.createElement("button");
settings.id = "analytics-settings";
settings.type = "button";
settings.lang = panel.lang;
settings.textContent = text.settings;
if (document.getElementById("map")) {
	panel.classList.add("map-consent");
	settings.classList.add("my-location-btn");
	settings.setAttribute("aria-label", text.settings);
	settings.title = text.settings;
	const icon = document.createElement("span");
	icon.className = "material-icons";
	icon.setAttribute("aria-hidden", "true");
	icon.textContent = "admin_panel_settings";
	settings.replaceChildren(icon);
}
settings.setAttribute("aria-controls", panel.id);
settings.setAttribute("aria-expanded", String(!panel.hidden));
settings.addEventListener("click", () => {
	panel.hidden = !panel.hidden;
	settings.setAttribute("aria-expanded", String(!panel.hidden));
	if (!panel.hidden) {
		accept.focus();
	}
});
document.body.append(panel, settings);

function applyConsent(choice, reload = true) {
	consent = choice;
	if (consentChangeHandler) {
		consentChangeHandler(choice, reload);
	}
}

function saveConsent(choice) {
	try {
		localStorage.setItem(consentKey, choice);
	} catch (error) {
		console.error("Could not save analytics consent", error);
		applyConsent("rejected", false);
		status.textContent = text.storageError;
		return;
	}
	panel.hidden = true;
	status.textContent = "";
	settings.setAttribute("aria-expanded", "false");
	settings.focus();
	applyConsent(choice);
}

accept.addEventListener("click", () => saveConsent("accepted"));
reject.addEventListener("click", () => saveConsent("rejected"));
window.addEventListener("storage", (event) => {
	if (event.key === consentKey || event.key === null) {
		applyConsent(event.newValue === "accepted" ? "accepted" : "rejected");
		panel.hidden = event.newValue === "accepted" || event.newValue === "rejected";
		settings.setAttribute("aria-expanded", String(!panel.hidden));
	}
});
