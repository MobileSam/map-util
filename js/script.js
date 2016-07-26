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

    parseCSV();
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
        'circle-color': '#3887be'
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

        if (!isNaN(parseFloat(latLng[latIndex])) && !isNaN(parseFloat(latLng[lngIndex]))) {
          geojson.features.push(createFeature(latLng[latIndex], latLng[lngIndex]));
          bounds.extend([latLng[lngIndex], latLng[latIndex]]);
        }
      });

      if (keepBounds !== true) {
        if (rows.length > 1) {
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
