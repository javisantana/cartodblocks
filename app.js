
var DEFAULT_CSS = "#t{  [mapnik-geometry-type=point] {  marker-fill: #FF6600;  marker-opacity: 1;  marker-width: 12;  marker-line-color: white;  marker-line-width: 3;  marker-line-opacity: 09;  marker-placement: point;  marker-type: ellipse;marker-allow-overlap: true; } [mapnik-geometry-type=linestring] {  line-color: #FF6600;   line-width: 2;   line-opacity: 07; }  [mapnik-geometry-type=polygon] {  polygon-fill:#FF6600;  polygon-opacity: 07;  line-opacity:1;  line-color: #FFFFFF;  } }";

function addTable(el, sql, query) {
  var table = '<table class="compact stripe zebra" cellspacing="0" width="100%" style="width: 100%;">';
  sql.execute(query).done(function(data) {
      table += "<thead><tr>";
      table += _(data.fields).map(function(f, v) {
        return "<th>" + v + "</th>";
      }).join('');
      table += "</tr></thead>";
      table += "<tbody>";
      _.each(data.rows, function(row) {
        table += "<tr>"
        table += _.map(row, function(r) {
            return "<td>" + r + "</td>";
        }).join('');
        table += "</tr>";
      })
      table += "</tbody>";
      table += "</table>";
     var t = $(table)
     t.insertAfter($(el).parent());
     t.DataTable({
       "paging":   false,
       "ordering": true,
       "info":     false,
       "searching": false
      });
  })
}

function addExplain(el, sql, query) {
  sql.execute(query).done(function(data) {
     var code = "<pre><code>" + _(data.rows).pluck('QUERY PLAN').join('\n') + "</code></pre>"
     var t = $(code)
     t.insertAfter($(el).parent());
     hljs.highlightBlock(t.find('code')[0]);
  });
}

function addDynamicMap(el, vizjson) {
  var id = "map_" + Date.now()
  el = $(el)
  var width = $(el.parent().parent()).width();
  var height = width/1.6;
  var t = $('<div class="map" id="' + id + '" style="height:' + height + 'px;" />');
  t.insertAfter($(el).parent());
  cartodb.createVis(id, vizjson)
}

function addMap(el, sql, query, user_name) {
  el = $(el)
  var width = $(el.parent().parent()).width();
  var height = width/1.6;
  sql.getBounds(query).done(function(bounds) {
    layer_definition = {
      user_name: user_name,
      tiler_domain: "cartodb.com",
      tiler_port: "80",
      tiler_protocol: "http",
      layers: [{
        type: "http",
        options: {
          urlTemplate: "http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          subdomains: [ "a", "b", "c" ]
        }
      }, {
        type: "cartodb",
        options: {
          sql: query,
          cartocss: DEFAULT_CSS,
          cartocss_version: "2.1.1"
        }
      }]
    }
    var i = cartodb.Image(layer_definition)
      .size(width, height)
      i.userOptions = {}
      i.bbox([bounds[1][1], bounds[1][0], bounds[0][1], bounds[0][0]]) 
      .getUrl(function(error, url) {
         var t = $('<img src="' + url + '" />');
         t.insertAfter($(el).parent());
      });
  });
}


function app() {
  $.get('https://api.github.com/gists/' + location.hash.slice(1), function(gist) {

      var md_content = gist.files['index.md'].content
      html_content = markdown.toHTML( md_content );

      var o = $('#owner')
      o.attr('href', gist.html_url)
      o.html(gist.owner.login);

      $('#content').append(html_content);
      $('code').each(function(i, el) {
        var g = el.innerHTML.replace(/\n/g, ' ').match(/([^#%:]*)([#%:])(.*)/)
        if (g) {
          var query = g[3].trim();
          var user = g[1].trim();
          var option = g[2].trim();
          var sql = cartodb.SQL({ user: user });
          if (option === '#') {
            if (query.trim().indexOf("explain") === 0) {
              addExplain(el, sql, query);
            } else {
              addTable(el, sql, query); 
            }
          } else if (option === '%'){
            var sql = cartodb.SQL({ user: user });
            addMap(el, sql, query, user) 
          } else if (option === ':') {
            addDynamicMap(el, query);
            /*el.parent().remove();
            el.remove();
            el = null;*/
            //https://team.cartodb.com/api/v2/viz/97143e78-2ddb-11e3-8874-3085a9a9563c/viz.json
          }
        }
        if (el) {
          hljs.highlightBlock(el);
        }
      });
  });
}
