var googleUrl = 'https://www.googleapis.com/fusiontables/v2/query?sql=select+*+from+';
var typesTable = '15yq7vGN2XBufTkrg9Z4XxrG0KOdMINW9hT8B28MU';
var placesTable = '16nlDIFuuJaTNDVwyunp3FCwpNKiRg9eiGcXUBX6K';
var googleKey = '&key=AIzaSyBL6mtgfjEKbXS33H5ArRvu49vlgzt-prI';
;
//Filter Object 
var Filter = function(data) {
  this.name = ko.observable(data.name)
  this.number = ko.observable(data.number);

}

var Place = function(data) {
   this.name = ko.observable(data.name);
   this.number = ko.observable(data.number);
   //convert loc string into latLng floats
   //needed to construct google latLng object later.
   this.lat = ko.observable(parseFloat(
     data.loc.substring(0, data.loc.indexOf("," ))));
   this.lng = ko.observable(parseFloat(
     data.loc.substring(data.loc.indexOf ( "," ) + 1 )));
}

//Binding handler for map init.
ko.bindingHandlers.montrealMap = {
    init: function (element) {
        var highlighter  = new google.maps.Circle({
            strokeColor: 'black',
            strokeOpacity: 2,
            strokeWeight: 2,
            fillColor: 'yellow',
            fillOpacity: 0.35,
            radius: 1000
          });
        var  map = new google.maps.Map(element, {
                name: "Montreal",
                center: {lat: 45.501689, lng: -73.567256 }, 
                zoom: 12 });
         var markerLayer = new google.maps.FusionTablesLayer({
                query: { select: 'Location',
                  from: placesTable
                  },
                styles: [{
                 markerOptions: {
                 iconName:  "red_pushpin",
                 animation: google.maps.Animation.DROP
                     }
                }],
            map: map,
           suppressInfoWindows: true// use custom window instance
                                 // allows for a custom close event listner
         });
         //custom popup window object
         var infoWindow = new google.maps.InfoWindow();
         
        //listener for map markers this listener is also
        // triggered when the display list place matching 
        // a marker is clicked
         google.maps.event.addListener(markerLayer,'click', function(e) {
         
             // needed for new marker click without close of
             // previous marker infoWindow.
              infoWindow.close();
              highlighter.setMap(null);

             //highlight current selected marker
              highlighter.setCenter(e.latLng);
              highlighter.setMap(map);

             //create html for popup window based on selected place/marker
             //I used google css class for consitent styles user experience
               var html = [];
               html.push('<div class="googft-info-window">');
               html.push("<b>" + e.row['Name'].columnName + ": </b>");
               html.push(e.row['Name'].value + "<br>");
               html.push("</div>");

              //open the popup window at marker's map position with html info
              infoWindow.setOptions({content : html.join(""),position : e.latLng});
              infoWindow.open(map);
             //addlister for window close event
           });

           google.maps.event.addListener(infoWindow,'closeclick',function(){
             //removes the highligt when popup window closed.
               highlighter.setMap(null); 
           });

          //save to vm so listner can be triggered from places list
          viewModel._markers = markerLayer;

         //save to vm for layer update. when view filter is changed
           viewModel._highligher = highlighter;
           viewModel._infoWindow = infoWindow;
    }


 };


// update map markers for a selected filter 
// 0 is default of all places
var updateLayer = function(data) {
   //remove any open marker highlighters, this can happen if user
   //toggles filter without closing a marker info window
    viewModel._highligher.setMap(null);
    viewModel._infoWindow.close();
    //0 is default view of all places, need to remove where clause from sql
    var options = (data == 0 ?
              { select: 'Location',
                from: '16nlDIFuuJaTNDVwyunp3FCwpNKiRg9eiGcXUBX6K',
              }
             :
              { select: 'Location',
                from: '16nlDIFuuJaTNDVwyunp3FCwpNKiRg9eiGcXUBX6K',
                 where: 'Type =' + "'" + data +"'"
               } );
    //set map markers based on places filter
    viewModel._markers.setOptions({query: options});
}

// populate filter list from google fusion table
var populateFilterList = function() {
      //get filter list options from table and
      //push to observable for data-bind
      $.ajax({
            url: googleUrl + typesTable + googleKey,
            dataType: 'json',
            success: function(data) {
             for (var i in data.rows) {
             var row = data.rows[i];
             filtersList.push(new Filter({name: row[0], number: row[1]}));
               
            };
        },
          error: function( data ) {
           alert( "pin data not available. Try again later" );
         }
        }); 
}

//update places' list based on filter 
// 0(default is all places)
var updatePlacesList = function(data) {
      placesList([]);//clear current places list
      
      //create sql string based on filter type number
       var url = googleUrl + placesTable +
            (data > 0  ? ' WHERE Type="' + data +'"': '') 
            + googleKey;
    
     //get places list based of view filter option from table
     //and push to observable
      $.ajax({
            url: url,
            dataType: 'json',
            success: function(data) {
               for (var i in data.rows) {
                  var row = data.rows[i];
                  placesList.push(
                  new Place({name: row[0],
                           number: row[1],
                            loc: row[2]}) );
                };

            },
             error: function(data ) {
                alert( "pin data not available. Try again later" );
                
             }
        }); 

}

var  placesList = ko.observableArray([]);
var  filtersList = ko.observableArray([]);
var viewModel = function(){
       var self = this;
       self.selectedFilter = ko.observable();
       //called only once to create filter list menu
       populateFilterList();
       // update places list start with default 
       updatePlacesList(0);
   
      //filter list drop down menu subscriber method
       self.selectedFilter.subscribe(function(newValue) {
            if(newValue == undefined){newValue = 0;}//use default
            updatePlacesList(newValue);
            updateLayer(newValue);
           }, this);

      //Place list button callback method
      self.placeClick = function(place){ 
           var row = [];
           //Create a row to mimic google fusion table cell row object
            row['Name']= {
                columnName : 'Name',
                value : place.name()
              };
            //create an event to mimic google fusion table mouse event
             var  mouseEvent = {
              row : row,
              latLng : new google.maps.LatLng({lat: place.lat(), lng: place.lng() })
            };
          //trigger map marker listener that cooresponds to this place
          google.maps.event.trigger(viewModel._markers, 'click', mouseEvent);
      };
}


ko.applyBindings(new viewModel());