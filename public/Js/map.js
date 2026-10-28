const mapContainer = document.getElementById("map");

if (!mapToken || !listing.geometry?.coordinates) {
  mapContainer.textContent = "The location map is currently unavailable.";
} else {
  mapboxgl.accessToken = mapToken;

  const map = new mapboxgl.Map({
    container: mapContainer,
    center: listing.geometry.coordinates,
    zoom: 9,
  });

  // Use text content rather than HTML so listing titles cannot inject markup.
  new mapboxgl.Marker({ color: "red" })
    .setLngLat(listing.geometry.coordinates)
    .setPopup(
      new mapboxgl.Popup({ offset: 25 }).setText(
        `${listing.title} — Exact location provided after booking.`
      )
    )
    .addTo(map);
}
