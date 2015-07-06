var map
  , markerPanel
  , latitudeSelect
  , longitudeSelect
  , config
  , alert
  , textarea;

$(document).ready(function() {
  latSelect = $('.latitude');
  lngSelect = $('.longitude');

  config = $('.config');
  alert = $('.alert');

  textarea = $('textarea');

  initMap();

  $('.panel-title').on('click', function(ev) {
    $(this).find('.glyphicon').toggleClass('glyphicon-chevron-up glyphicon-chevron-down');
    $('.panel-body').toggle();

    return false;
  });

  $('button[type="submit"]').on('click', function(ev) {
    parseCSV();

    return false;
  });

  $('button[type="config"]').on('click', function(ev) {
    toggleConfig(false, true);

    return false;
  });

  $('button[type="clear"]').on('click', function(ev) {
    markerPanel.clearLayers();

    toggleConfig(true, true);
    textarea.val('');

    latSelect.html('');
    lngSelect.html('');

    return false;
  });

  textarea.on('input propertychange', function(ev) {
    latSelect.html('');
    lngSelect.html('');

    parseCSV();
  });
});

function initMap() {
  L.mapbox.accessToken = 'pk.eyJ1IjoiZGlub3oiLCJhIjoidU1XcjhDOCJ9.R0eFLWNRudaUCzXjd0R4cg';

  map = L.mapbox.map('map').setView([45.5594408, -73.7118666], 11);
  map.addLayer(L.mapbox.tileLayer('dinoz.gan1bagi'));
  map.on('click', function(e) {
    var msg = e.latlng.lat + ', ' + e.latlng.lng
      , icon = L.divIcon({ className: 'loc', iconSize: null })
      , m;

    if (textarea.val().indexOf(msg) == -1) {
      m = L.marker(e.latlng, { icon: icon, draggable: true }).on('dragend', markerDragged).on('dblclick', removeMarker).addTo(markerPanel);

      m.line = msg;

      if (textarea.val()) {
        msg = textarea.val() + '\n' + msg;
      }

      textarea.val(msg);
    }
  });

  markerPanel = new L.LayerGroup();
  map.addLayer(markerPanel);
}

function parseCSV() {
  var csv = textarea.val()
    , rows = csv.split('\n')
    , latLng;

  if (rows.length && rows[0].split(',').length > 1) {
    setOptions(rows);
    findIndexes(rows);

    var latIndex = latSelect.val() || -1
      , lngIndex = lngSelect.val() || -1;

    if (latIndex != -1 && lngIndex != -1) {
      toggleConfig(true, true);

      var icon = L.divIcon({ className: 'loc', iconSize: null })
        , bounds = L.latLngBounds([])
        , pos, m;

      markerPanel.clearLayers();

      rows.forEach(function(item) {
        latLng = item.split(',');

        try {
          pos = new L.LatLng(latLng[latIndex], latLng[lngIndex]);
          bounds.extend(pos);

          m = L.marker(pos, { icon: icon, draggable: true }).on('dragend', markerDragged).on('dblclick', removeMarker).addTo(markerPanel);
          m.line = latLng[latIndex] + ',' + latLng[lngIndex];
        } catch (err) {
          // Invalid lat/lng pair most likely cause by the header row or invalid user config
        }
      });

      map.fitBounds(bounds);
    } else {
      toggleConfig(false, false);
    }
  }
}

function setOptions(rows) {
  var options = '<option value="-1"></options>';

  if (!latSelect.html() || !lngSelect.html()) {
    if (rows && rows.length) {
      rows[0].split(',').forEach(function(item, index) {
        options += '<option value="' + index + '">' + item + '</option>';
      });
    }

    latSelect.html(options);
    lngSelect.html(options);
  }
}

function findIndexes(rows) {
  if (rows.length && (latSelect.val() == -1 || lngSelect.val() == -1)) {
    var lngIndex = findLngIndex(rows)
      , latIndex = -1;

    if (lngIndex != -1) {
      latIndex = findLatIndex(rows, lngIndex);
    }

    if (rows[0].split(',').length == 2 && latIndex == -1 && lngIndex == -1) {
      latIndex = 0;
      lngIndex = 1;
    }

    latSelect.val(latIndex);
    lngSelect.val(lngIndex);
  }
}

function findLngIndex(rows) {
  var lngIndex = -1
    , parts;

  rows.forEach(function(row) {
    parts = row.split(',');

    parts.forEach(function(item, index) {
      if (!isNaN(item) && isFinite(item) && item.indexOf('.') != -1) {
        if (((item >= -180 && item < -90) || (item > 90 && item <= 180)) && lngIndex == -1) {
          lngIndex = index;
        }
      } else if (lngIndex == -1 && (item == 'longitude' || item == 'lon' || item == 'lng')) {
        lngIndex = index;
      }
    });
  });

  return lngIndex;
}

function findLatIndex(rows, lngIndex) {
  var latIndex = -1
    , parts;

  rows.forEach(function(row) {
    parts = row.split(',');

    parts.forEach(function(item, index) {
      if (index != lngIndex && !isNaN(item) && isFinite(item) && item.indexOf('.') != -1) {
        if (item >= -90 && item <= 90 && latIndex == -1) {
          latIndex = index;
        }
      } else if (latIndex == -1 && (item == 'latitude' || item == 'lat')) {
        latIndex = index;
      }
    });
  });

  return latIndex;
}

function toggleConfig(hide, hideAlert) {
  config.toggleClass('hidden', hide);
  alert.toggleClass('hidden', hideAlert);
}

function markerDragged(e) {
  var line = e.target._latlng.lat + ', ' + e.target._latlng.lng;

  textarea.val(textarea.val().replace(e.target.line, line));

  e.target.line = line;
}

function removeMarker(e) {
  textarea.val(textarea.val().replace(e.target.line + '\n', ''));
  markerPanel.removeLayer(e.target);
}
