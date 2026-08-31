(function () {
    const maps = new WeakMap();
    let googleMapsPromise;

    function hasBusinessCoordinates(latitude, longitude) {
        return Number.isFinite(latitude)
            && Number.isFinite(longitude)
            && latitude >= -90
            && latitude <= 90
            && longitude >= -180
            && longitude <= 180
            && (latitude !== 0 || longitude !== 0);
    }

    function escapeHtml(value) {
        return String(value || "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll("\"", "&quot;")
            .replaceAll("'", "&#39;");
    }

    function markerContent(label) {
        const title = label && label.trim().length > 0 ? label.trim() : "Selected location";
        return `<div class="business-location-map-info"><strong>${escapeHtml(title)}</strong></div>`;
    }

    function loadGoogleMaps(apiKey) {
        if (window.google?.maps) {
            return Promise.resolve(window.google.maps);
        }

        if (!apiKey || !apiKey.trim()) {
            return Promise.resolve(null);
        }

        if (!googleMapsPromise) {
            googleMapsPromise = new Promise((resolve) => {
                const script = document.createElement("script");
                script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey.trim())}`;
                script.async = true;
                script.defer = true;
                script.onload = () => resolve(window.google?.maps || null);
                script.onerror = () => resolve(null);
                document.head.appendChild(script);
            });
        }

        return googleMapsPromise;
    }

    function updateGoogleMarker(state, latitude, longitude, label) {
        if (!state.googleMap || !state.googleMarker) {
            return;
        }

        const hasCoordinates = hasBusinessCoordinates(latitude, longitude);
        const position = hasCoordinates
            ? { lat: latitude, lng: longitude }
            : state.googleMap.getCenter();

        state.googleMarker.setPosition(position);
        state.googleInfoWindow.setContent(markerContent(label));
        state.googleInfoWindow.open({
            map: state.googleMap,
            anchor: state.googleMarker,
            shouldFocus: false
        });

        if (hasCoordinates) {
            state.googleMap.panTo(position);
            if (state.googleMap.getZoom() < 15) {
                state.googleMap.setZoom(16);
            }
        }
    }

    async function attachGoogleMap(element, dotNetReference, latitude, longitude, label, apiKey) {
        const googleMaps = await loadGoogleMaps(apiKey);
        if (!googleMaps) {
            return null;
        }

        const mapCanvas = document.createElement("div");
        mapCanvas.className = "business-location-editor__google-map";
        element.prepend(mapCanvas);
        element.classList.add("business-location-editor__map--google");

        const hasCoordinates = hasBusinessCoordinates(latitude, longitude);
        const center = hasCoordinates ? { lat: latitude, lng: longitude } : { lat: 39.8283, lng: -98.5795 };
        const googleMap = new googleMaps.Map(mapCanvas, {
            center,
            zoom: hasCoordinates ? 16 : 4,
            mapTypeControl: false,
            fullscreenControl: false,
            streetViewControl: false,
            clickableIcons: false
        });

        const googleMarker = new googleMaps.Marker({
            map: googleMap,
            position: center,
            draggable: true,
            title: label || "Selected location"
        });

        const googleInfoWindow = new googleMaps.InfoWindow({
            content: markerContent(label)
        });

        const state = {
            googleMap,
            googleMarker,
            googleInfoWindow,
            dispose() {
                googleInfoWindow.close();
                googleMarker.setMap(null);
                mapCanvas.remove();
                element.classList.remove("business-location-editor__map--google");
            },
            setMarker(nextLatitude, nextLongitude, nextLabel) {
                updateGoogleMarker(state, nextLatitude, nextLongitude, nextLabel);
            }
        };

        const emitPosition = (position) => {
            if (!position) {
                return;
            }

            const nextLatitude = Number(position.lat().toFixed(6));
            const nextLongitude = Number(position.lng().toFixed(6));
            state.setMarker(nextLatitude, nextLongitude, label);
            dotNetReference.invokeMethodAsync("HandleMarkerChanged", nextLatitude, nextLongitude);
        };

        googleMarker.addListener("dragend", () => emitPosition(googleMarker.getPosition()));
        googleMap.addListener("click", (event) => emitPosition(event.latLng));
        googleInfoWindow.open({
            map: googleMap,
            anchor: googleMarker,
            shouldFocus: false
        });

        return state;
    }

    window.businessLocationMap = {
        async initialize(element, dotNetReference, latitude, longitude, label, apiKey) {
            if (!element || maps.has(element)) {
                return maps.has(element);
            }

            const googleState = await attachGoogleMap(element, dotNetReference, latitude, longitude, label, apiKey);
            if (!googleState) {
                return false;
            }

            maps.set(element, googleState);
            return true;
        },

        setMarker(element, latitude, longitude, label) {
            const state = maps.get(element);
            if (!element || !state) {
                return;
            }

            state.setMarker(latitude, longitude, label);
        },

        dispose(element) {
            const state = maps.get(element);
            if (!element || !state) {
                return;
            }

            state.dispose();
            maps.delete(element);
        }
    };
}());
