var map
  , latSelect
  , lngSelect
  , config
  , alert
  , textarea;

var geojson = {
  type: 'FeatureCollection',
  features: []
};


$(document).ready(function() {
  latSelect = $('.latitude');
  lngSelect = $('.longitude');

  config = $('.config');
  alert = $('.alert');

  textarea = $('textarea');

  initMap();

  $('.panel-heading').on('click', togglePanel);

  $('button[btn-action="submit"]').on('click', parseCSV);
  $('button[btn-action="clear"]').on('click', clearAll);
  $('button[btn-action="config"]').on('click', function () {
    return toggleConfig(false, true);
  });

  textarea.on('input propertychange', function(ev) {
    latSelect.html('');
    lngSelect.html('');

    parseWKT();
    decodePolyline();
    parseCSV();
  });

  map.on('load', function () {
    var text = getParameterByName('text');

    if (text && text.length) {
      textarea.val(text.replace('|', '\n'));
      parseCSV();
    }
  });
});

function initMap() {
  mapboxgl.accessToken = 'pk.eyJ1IjoidHJhbnNpdCIsImEiOiJjaWhtY2N4NWswNnBydGpqN2hnN3MyZWVvIn0.L8k881joZvXRJLHrd0ki7Q';

  map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v9',
      center: [ -73.7118666, 45.5594408 ],
      zoom: 11
  });

  map.addControl(new mapboxgl.Geocoder({ position: 'top-left' }));
  map.addControl(new mapboxgl.Navigation({ position: 'top-left' }));
  map.addControl(new mapboxgl.Geolocate({ position: 'top-left' }));

  source = new mapboxgl.GeoJSONSource({
    data: geojson
  });

  map.on('load', function() {
    map.addSource('point', source);

    map.addLayer({
      'id': 'point',
      'type': 'circle',
      'source': 'point',
      'paint': {
        'circle-radius': 10,
        'circle-color': '#d43f3a'
      }
    });
  });

  map.on('click', function (e) {
    var features = map.queryRenderedFeatures(e.point, { layers: ['point'] });

    if (features.length) {
      map.flyTo({ center: features[0].geometry.coordinates });
    } else {
      var value = textarea.val();

      if (value.length) {
        value += '\n';
      }

      value += e.lngLat.lat + ',' + e.lngLat.lng;
      textarea.val(value);

      parseCSV(true);
    }
});
}

function parseCSV(keepBounds) {
  var csv = textarea.val()
    , rows = csv.split('\n')
    , bounds = new mapboxgl.LngLatBounds()
    , latLng, pos;

  geojson.features = [];

  if (rows.length && rows[0].split(/[,\t]/g).length > 1) {
    setOptions(rows);
    findIndexes(rows);

    var latIndex = latSelect.val() || -1
      , lngIndex = lngSelect.val() || -1;

    if (latIndex != -1 && lngIndex != -1) {
      toggleConfig(true, true);

      rows.forEach(function(item) {
        latLng = item.split(/[,\t]/g);

        if (latLng.length >= 2 && !isNaN(parseFloat(latLng[latIndex])) && !isNaN(parseFloat(latLng[lngIndex]))) {
          geojson.features.push(createFeature(latLng[latIndex], latLng[lngIndex]));
          bounds.extend([latLng[lngIndex], latLng[latIndex]]);
        }
      });

      if (keepBounds !== true) {
        if (geojson.features.length > 1) {
          map.fitBounds(bounds);
        } else {
          map.flyTo({ center: geojson.features[0].geometry.coordinates });
        }
      }
    } else {
      toggleConfig(false, false);
    }
  }

  source.setData(geojson);

  return false;
}

function decodePolyline() {
  var encoded = textarea.val(),
    points = [],
    index = 0,
    len = encoded.length,
    lat = 0,
    lng = 0;

  if (encoded.split('\n').length !== 1 || !/[a-zA-Z]/g.test(encoded)) {
    // Only check for encoded polyline on the first line and if it contains at least one letter
    return;
  }

    while (index < len) {
        var b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
        lat += deltaLat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
        lng += deltaLng;

        points.push([lat / 1e5, lng / 1e5]);
    }

    if (points.length) {
      textarea.val(points.map((point) => {
        return `${point[0]}, ${point[1]}`
      }).join('\n'));
    }
}

function parseWKT() {
  var text = textarea.val();

  // Match WKT POINT format: POINT(lng lat) or POINT (lng lat)
  var wktPattern = /^POINT\s*\(\s*(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s*\)$/i;
  var match = text.trim().match(wktPattern);

  if (match) {
    var lng = parseFloat(match[1]);
    var lat = parseFloat(match[2]);

    // Convert WKT (x, y) = (lng, lat) to the app's lat, lng format
    textarea.val(`${lat}, ${lng}`);
  }
}

function createFeature(lat, lng) {
  return {
    'type': 'Feature',
    'geometry': {
      'type': 'Point',
      'coordinates': [ lng, lat ]
    }
  };
}

function togglePanel() {
  var $this = $(this);

  $this.find('.glyphicon').toggleClass('glyphicon-chevron-up glyphicon-chevron-down');
  $this.next().toggle();

  return false;
}

function clearAll() {
  toggleConfig(true, true);
  textarea.val('');

  latSelect.html('');
  lngSelect.html('');

  geojson.features = [];
  source.setData(geojson);

  return false;
}

function setOptions(rows) {
  var options = '<option value="-1"></options>';

  if (!latSelect.html() || !lngSelect.html()) {
    if (rows && rows.length) {
      rows[0].split(/[,\t]/g).forEach(function(item, index) {
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

    if (rows[0].split(/[,\t]/g).length == 2 && latIndex == -1 && lngIndex == -1) {
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
    parts = row.split(/[,\t]/g);

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
    parts = row.split(/[,\t]/g);

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

function getParameterByName(name, url) {
  if (!url) {
    url = window.location.href;
  }

  name = name.replace(/[\[\]]/g, "\\$&");

  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);

  if (!results) {
    return null;
  }

  if (!results[2]) {
    return '';
  }

  return decodeURIComponent(results[2].replace(/\+/g, " "));
}
