var initialCats = [
{    
    clickCount: 0,
     name: 'Tabby',
     imgSrc:' img/tabby.jpg',
     nicknames:['black', 'yellow', 'blue', 'red'] 
},{    
     clickCount: 0,
     name: 'Tabby2',
     imgSrc:' img/tabby2.jpg',
     nicknames:['black2', 'yellow2', 'blue2', 'red2'] 
}]


var Cat = function(data) {
this.clickCount = ko.observable(data.clickCount);
this.name = ko.observable(data.name);
this.imgSrc = ko.observable(data.imgSrc);
this.nicknames = ko.observableArray(data.nicknames);
  
   this.title = ko.computed(
          function(){
              var title;
              var num = this.clickCount();
              if (num < 10){
              title = 'Newborn';
              }else {
                     title = 'older';
              }
             return(title);
             }
     ,this);

}

var ViewModel = function(){
    
    var self = this;
    
    this.catList = ko.observableArray([]);
    initialCats.forEach(
                    function(catItem){
                        self.catList.push(new Cat(catItem));
                       } );

     this.currentCat = ko.observable(self.catList()[0]);
    
     this.incrementCounter = function(){
             self.currentCat().clickCount(self.currentCat().clickCount()+ 1);
               };
     
     this.setCat = function(clicked) {
               self.currentCat(clicked);
        };

   

}

ko.applyBindings(new ViewModel());