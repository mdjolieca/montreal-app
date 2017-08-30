var googleUrl = 'https://www.googleapis.com/fusiontables/v2/query?sql=select+*+from+';
var typesTable = '15yq7vGN2XBufTkrg9Z4XxrG0KOdMINW9hT8B28MU';
var placesTable = '16nlDIFuuJaTNDVwyunp3FCwpNKiRg9eiGcXUBX6K';
var googleKey = '&key=AIzaSyBL6mtgfjEKbXS33H5ArRvu49vlgzt-prI';
var wikiLinks =  ko.observableArray([]);
                
//Filter Object for fliters list 
var Filter = function(data) {
  this.name = ko.observable(data.name);
  this.number = ko.observable(data.number);

};
//Place object for places list
var Place = function(data) {
   this.name = ko.observable(data.name);
   this.number = ko.observable(data.number);
   //convert loc string into latLng floats
   //needed to construct google latLng object later.
   this.lat = ko.observable(parseFloat(
     data.loc.substring(0, data.loc.indexOf("," ))));
   this.lng = ko.observable(parseFloat(
     data.loc.substring(data.loc.indexOf ( "," ) + 1 )));
};
// wiki article link object
var WikiLink = function(data){
  this.url=ko.observable(('http://en.wikipedia.org/wiki/' + data));
};


//populate marker/place popup window
var getWikiInfo = function(data) {
  //call wiki links api if data if data bind to pop up info window
  var wUrl = 'https://en.wikipedia.org/w/api.php?action=opensearch&search=' 
              + data + '&format=json&callback=?';
   $.ajax({
          type: "GET",
          url: wUrl,
          contentType: "application/json; charset=utf-8",
          async: false,
          dataType: "json",
          success: function (response) {
             var articles = response[1];
             wikiLinks=[];
             for(var i=0; i< articles.length; i++) {
                wikiLinks.push(new WikiLink(articles[i]));
             }
             // we have data now bind to popup window
             ko.applyBindings(self, document.getElementById('infoWindow')); 

          },
          error: function (errorMessage) {
             // no action needed, error here will
             // not distrub user experience

          }
   });

};

//Binding handler for map init.
ko.bindingHandlers.montrealMap = {
   init: function (element) {
    
    //create a highlighter to animate markers on click
     var highlighter  = new google.maps.Circle({
           strokeColor: 'black',
           strokeOpacity: 2,
           strokeWeight: 2,
           fillColor: 'yellow',
           fillOpacity: 0.35,
           radius: 1000
     });
    
     //create the map
     var  map = new google.maps.Map(element, {
           name: "Montreal",
           center: {lat: 45.503949, lng: -73.587577 },
           zoom: 12,
           clickableIcons: false
     });

     //create map markers from google fusion tablea
     var markerLayer = new google.maps.FusionTablesLayer({

           query: {select: 'Location', from: placesTable},
           styles: [{markerOptions: {iconName:  "red_pushpin"}}],
           map: map,
           suppressInfoWindows: true// use custom window instance
                                 // allows for a custom content/close event listner
     });
     
     //custom popup window object, for marker/place information
     var infoWindow = new google.maps.InfoWindow();
        
     //listener for map markers this listener is also
     // triggered when the display list place matching
     // a marker is clicked
     google.maps.event.addListener(markerLayer,'click', function(e) {

         var imageUrl = '<img src="https://maps.googleapis.com/maps/api/streetview?size=300x150&location=' +
                         e.latLng.lat() + "," + e.latLng.lng() + googleKey + '">';

          //create html for popup window based on selected place/marker
         var html = [];
             html.push('<div id="infoWindow"> ');
             html.push("<b>" + e.row['Name'].columnName + ": </b>");
             html.push(e.row['Name'].value + "<br>");
             html.push('<div>');
             html.push('<ul id="wikiLinks" data-bind="foreach: wikiLinks">');
             html.push('<li><a  target="_blank" data-bind="attr:{href:url},text:url"></a></li>');
             html.push('</ul>');
             html.push('<div>');
             html.push(imageUrl);
             html.push("</div>");

         //needed to clean up in case of new marker click without close of
         //previous marker infoWindow.
         infoWindow.close();
         highlighter.setMap(null);

         //highlight current selected marker
         highlighter.setCenter(e.latLng);
         highlighter.setMap(map);  
         infoWindow.setOptions({content : html.join(""),position : e.latLng});
         infoWindow.open(map); 
         //call wiki links for article and bind to info window popup
         getWikiInfo(e.row['Name'].value);


     });//end click listener for markers and places list

     //addlister for window close event
     google.maps.event.addListener(infoWindow,'closeclick',function(){
         //removes the highligt when popup window closed.
          highlighter.setMap(null); 
      });

      //save to vm so listner can be triggered from places list
      viewModel._markers = markerLayer;
           
      //save to vm for layer update. when view filter is changed
      viewModel._infoWindow = infoWindow;
      viewModel._montrealMap = map;
      viewModel._highlighter = highlighter;

    }


 };


var viewModel = function(){

   var self = this;
   this.placesList = ko.observableArray([]);
   this.filtersList = ko.observableArray([]);
    
   //update places' list based on filter 0 =(default is all places)
   this.updatePlacesList = function(data) {

       this.placesList([]);//clear current places list

       //create sql string based on filter type number
       var url = googleUrl + placesTable +
       (data > 0  ? ' WHERE Type="' + data +'"': '') + googleKey;
    
       //get places list based on view filter options from table
       //and push to observable
       $.ajax({
         url: url,
         dataType: 'json',
         success: function(data) {
           var bounds = new google.maps.LatLngBounds();
           for(var i in data.rows) {
               var column = data.rows[i];
               var place = new Place({
                           name: column[0],
                           number: column[1],
                           loc: column[2],
                           placeId: column[3]});//Todo add Google Places Info
                self.placesList.push(place);
                bounds.extend(new google.maps.LatLng({lat: place.lat(), lng: place.lng() }));
           }
           //recenter map and defualt zoom on filter change
           viewModel._montrealMap.setCenter(bounds.getCenter());
           viewModel._montrealMap.setZoom(12);
         },
         error: function(data ) {
           alert( "pin data not available. Try again later" );
         }
       }); 
   };//End Update Places List

   //populate filter list from google fusion table
   this.populateFilterList = function() {
     //get filter list options from table and
     //push to observable for data-bind
     $.ajax({
         url: googleUrl + typesTable + googleKey,
         dataType: 'json',
         success: function(data) {
           for (var i in data.rows) {
             var row = data.rows[i];
             self.filtersList.push(new Filter({name: row[0], number: row[1]}));
           }
         },
         error: function( data ) {
           alert( "pin data not available. Try again later" );
         }
     }); 
   };

   //observable for filter drop down
   this.selectedFilter = ko.observable();
   //called only once to create filter list menu
   this.populateFilterList();
   // update places list start with default 
   this.updatePlacesList(0);

   //filter list drop down menu subscriber method
   this.selectedFilter.subscribe(function(newValue) {
       if(newValue === undefined){newValue = 0;}//use default
       self.updatePlacesList(newValue);
       //remove any open marker info windows
       viewModel._infoWindow.close();
       viewModel._highlighter.setMap(null);

       //0 is default view of all places, need to remove where clause from sql
       var options = (newValue ===0 ?
              { select: 'Location',
                from: '16nlDIFuuJaTNDVwyunp3FCwpNKiRg9eiGcXUBX6K',
              }
             :
              { select: 'Location',
                from: '16nlDIFuuJaTNDVwyunp3FCwpNKiRg9eiGcXUBX6K',
                 where: 'Type =' + "'" + newValue +"'"
               } );
      //set map markers based on filter
      viewModel._markers.setOptions({query: options});

   }, this);

   //Places list button callback method
   this.placeClick = function(place){ 

       var row = [];
       //Create a row to mimic google fusion table cell row object
       row['Name']= {columnName : 'Name', value : place.name()};
       row['Lat']= {columnName : 'Lat', value : place.lat()};
       row['Lng']= {columnName : 'Lng', value : place.lng()};

       //create an event to mimic google fusion table mouse event
       var mouseEvent = {row : row,
           latLng : new google.maps.LatLng({lat: place.lat(), lng: place.lng()})
       };

       //trigger map marker listener that cooresponds to this place
       google.maps.event.trigger(viewModel._markers, 'click', mouseEvent);
   };

};//End ViewModel()

ko.applyBindings(new viewModel());
