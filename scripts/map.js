	var DEFAULT_LAT = 45.5230433; // Montreal office
	var DEFAULT_LNG = -73.5814131; // Montreal office
	var currentMap;

	function initMap() {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', init, { once: true });
			return;
		}
		init();
	}
	window.initMap = initMap;

	function init() {
		if (currentMap) {
			return;
		}
		var mapOptions = {
			backgroundColor: '#230913', // map landscape color
			zoom: 10,
			center: new google.maps.LatLng(DEFAULT_LAT, DEFAULT_LNG),
			mapTypeId: 'roadmap',
			disableDefaultUI: true,
			// colorScheme: ColorScheme.DARK,
			styles: [
				{ featureType: "all", elementType: "all", stylers: [{ visibility: "off" }] },
				{ featureType: 'road', elementType: 'geometry', stylers: [{ visibility: "simplified" }, { color: '#3D2730' }] },
				{ featureType: 'water', elementType: 'geometry', stylers: [{ visibility: "simplified" }, { color: '#58454F' }] },
				{ featureType: 'landscape', elementType: 'geometry', stylers: [{ visibility: "simplified" }, { color: '#230913' }] },
			]
		};
		var mapElement = document.getElementById('map');
		var map = new google.maps.Map(mapElement, mapOptions);
		currentMap = map;
		setupMyLocationButton();
		loadMarkers(map);
		centerMapOnDeviceLocation(map);
	}

	function setupMyLocationButton() {
		var btn = document.getElementById('my-location-btn');
		if (!btn) {
			return;
		}
		btn.addEventListener('click', function () {
			if (!currentMap) {
				return;
			}
			requestDeviceLocation(currentMap);
		});
	}

	function requestDeviceLocation(map) {
		if (!navigator.geolocation) {
			centerMapOnDeviceLocationIpwhois(map).catch(function () {
				setDefaultMapCenter(map);
			});
			return;
		}
		navigator.geolocation.getCurrentPosition(
			function (position) {
				var lat = Number(position.coords && position.coords.latitude);
				var lng = Number(position.coords && position.coords.longitude);
				if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
					console.warn('Navigator geolocation returned invalid coordinates');
					centerMapOnDeviceLocationIpwhois(map).catch(function () {
						setDefaultMapCenter(map);
					});
					return;
				}
				map.setCenter(new google.maps.LatLng(lat, lng));
			},
			function (error) {
				console.warn('Navigator geolocation request failed:', error);
				centerMapOnDeviceLocationIpwhois(map).catch(function () {
					setDefaultMapCenter(map);
				});
			},
			{ enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
		);
	}

	function centerMapOnDeviceLocation(map) {
		// Only use the browser's navigator.geolocation automatically if permission
		// was already granted, so we never trigger the permission prompt/dialog
		// without the user explicitly clicking the "my location" button.
		if (navigator.geolocation && navigator.permissions && navigator.permissions.query) {
			navigator.permissions.query({ name: 'geolocation' })
				.then(function (permissionStatus) {
					if (permissionStatus && permissionStatus.state === 'granted') {
						return centerMapOnDeviceLocationNavigator(map);
					}
					return centerMapOnDeviceLocationIpwhois(map);
				})
				.catch(function () {
					return centerMapOnDeviceLocationIpwhois(map);
				})
				.catch(function () {
					setDefaultMapCenter(map);
				});
			return;
		}
		centerMapOnDeviceLocationIpwhois(map)
			.catch(function () {
				setDefaultMapCenter(map);
			});
	}

	function centerMapOnDeviceLocationIpwhois(map) {
		return fetch('https://ipwho.is/', { cache: 'no-store' })
			.then(function (response) {
				if (!response.ok) {
					throw new Error('ipwho.is lookup failed: ' + response.status);
				}
				return response.json();
			})
			.then(function (result) {
				if (!result || result.success !== true) {
					throw new Error('ipwho.is returned unsuccessful response');
				}
				var lat = Number(result.latitude);
				var lng = Number(result.longitude);
				if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
					throw new Error('ipwho.is returned invalid coordinates');
				}
				map.setCenter(new google.maps.LatLng(lat, lng));
				return true;
			})
			.catch(function (error) {
				console.warn('ipwho.is geolocation failed:', error);
				throw error;
			});
	}

	function centerMapOnDeviceLocationNavigator(map) {
		if (!navigator.geolocation) {
			return Promise.reject(new Error('navigator.geolocation is unavailable'));
		}

		var permissionCheck = navigator.permissions && navigator.permissions.query
			? navigator.permissions.query({ name: 'geolocation' })
			: Promise.resolve({ state: 'prompt' });

		return permissionCheck.then(function (permissionStatus) {
			if (permissionStatus && permissionStatus.state === 'denied') {
				throw new Error('Geolocation permission is denied');
			}

			return new Promise(function (resolve, reject) {
				navigator.geolocation.getCurrentPosition(
					function (position) {
						var lat = Number(position.coords && position.coords.latitude);
						var lng = Number(position.coords && position.coords.longitude);
						if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
							reject(new Error('navigator geolocation returned invalid coordinates'));
							return;
						}
						map.setCenter(new google.maps.LatLng(lat, lng));
						resolve(true);
					},
					function (error) {
						console.warn('Navigator geolocation failed:', error);
						reject(error);
					},
					{ enableHighAccuracy: false, timeout: 5000, maximumAge: 3600000 }
				);
			});
		});
	}

	function setDefaultMapCenter(map) {
		console.info('Using default map center (Montreal office).');
		map.setCenter(new google.maps.LatLng(DEFAULT_LAT, DEFAULT_LNG));
	}

	function loadMarkers(map) {
		var infoWindow = new google.maps.InfoWindow();
		var showBetaModules = new URLSearchParams(window.location.search).get('beta') === 'true';

		fetch('data/modules.json', { cache: 'no-store' })
			.then(function (response) {
				if (!response.ok) {
					throw new Error('Failed to load modules.json: ' + response.status);
				}
				return response.json();
			})
			.then(function (modules) {
				modules.forEach(function (module) {
					if (!showBetaModules && module.store !== 'production') {
						return;
					}

					var lat = parseFloat(module.lat);
					var lng = parseFloat(module.lng);
					if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
						return;
					}

					var position = new google.maps.LatLng(lat, lng);
					var color = normalizeHexColor(module.color);
					var iconName = markerIconNameForTypeId(module.type_id);
					var marker = new google.maps.Marker({
						position: position,
						map: map,
						title: module.name || module.pkg || 'MonTransit',
						icon: {
							path: google.maps.SymbolPath.CIRCLE,
							fillColor: color,
							fillOpacity: 1,
							strokeColor: '#FFFFFF',
							strokeWeight: 1,
							scale: 13
						},
						label: iconName ? {
							text: iconName,
							color: '#FFFFFF',
							fontFamily: 'Material Icons',
							fontSize: '17px',
							fontWeight: '400'
						} : undefined
					});

					marker.addListener('click', function () {
						infoWindow.setContent(buildInfoWindowContent(module));
						infoWindow.open(map, marker);
					});
				});
			})
			.catch(function (error) {
				console.error('Could not render map markers from modules.json', error);
			});
	}

	function markerIconNameForTypeId(typeId) {
		var value = (typeId || '').toString().trim();
		switch (value) {
			case '0': // LIGHT_RAIL
				return 'tram';
			case '1': // SUBWAY
				return 'subway';
			case '2': // TRAIN
				return 'directions_railway';
			case '3': // BUS
				return 'directions_bus';
			case '4': // FERRY
				return 'directions_boat_filled';
			case '100': // BIKE
				return 'directions_bike';
			default:
				return '';
		}
	}

	function buildInfoWindowContent(module) {
		var isBetaPrivate = (module.store || '').toString().trim() === 'beta-private';
		var baseTitle = (module.name || module.pkg || 'MonTransit');
		var title = escapeHtml(baseTitle + (isBetaPrivate ? ' [BETA]' : ''));
		var location = escapeHtml(module.location || '');
		var pkg = (module.pkg || '').toString().trim();
		var repo = (module.repo || '').toString().trim();
		var iconUrl = '';
		if (repo) {
			iconUrl = 'https://raw.githubusercontent.com/mtransitapps/'
				+ encodeURIComponent(repo)
				+ '/master/app-android/src/main/play/listings/en-US/graphics/icon/1.png';
		}
		var iconHtml = iconUrl
			? '<img src="' + iconUrl + '" alt="' + title + ' icon" style="width:48px;height:48px;display:block;margin:0 auto 8px auto;border-radius:8px;">'
			: '';
		if (!pkg) {
			return ''
				+ '<div style="font-family:Roboto,Arial,sans-serif;max-width:256px;text-align:center;">'
				+ iconHtml
				+ '<strong style="display:block;">' + title + '</strong>'
				+ (location ? '<span style="display:block;margin-top:4px;margin-bottom:8px;font-size:12px;color:#5f6368;">' + location + '</span>' : '')
				+ '</div>';
		}
		var playStoreUrl = isBetaPrivate
			? 'https://play.google.com/apps/testing/' + encodeURIComponent(pkg)
			: 'https://play.google.com/store/apps/details?id=' + encodeURIComponent(pkg);
		return ''
			+ '<div style="font-family:Roboto,Arial,sans-serif;max-width:256px;text-align:center;">'
			+ iconHtml
			+ '<strong style="display:block;">' + title + '</strong>'
			+ (location ? '<span style="display:block;margin-top:4px;margin-bottom:8px;font-size:12px;color:#5f6368;">' + location + '</span>' : '')
			+ '<a href="' + playStoreUrl + '" target="_blank" rel="noopener noreferrer" aria-label="Open on Google Play" style="display:inline-block;">'
			+ '<img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"'
			+ ' alt="Get it on Google Play" style="width:180px;height:auto;display:block;margin:0 auto;">'
			+ '</a>'
			+ '</div>';
	}

	function escapeHtml(value) {
		return (value || '').toString()
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function normalizeHexColor(color) {
		var value = (color || '').toString().trim();
		if (!value) {
			return '#1E88E5';
		}
		if (value.charAt(0) !== '#') {
			value = '#' + value;
		}
		return /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#1E88E5';
	}
