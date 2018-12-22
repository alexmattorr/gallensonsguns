(function($){
  var menu = {
    mobile : function() {
      var headerMenu = $('.header-menu'),
          toggle = $('#mobile-menu-toggle'),
          icons = $('#mobile-menu-toggle svg'),
          open = 'is-open';

      toggle.click(function() {
        icons.toggle();
        headerMenu.toggleClass(open);
        menu.modal();
      });
    },

    modal : function() {
      var body = $('body'),
          modal = $('.modal-bg'),
          open = 'modal-open';

      modal.fadeToggle(250);
      body.toggleClass(open);
    },

    init : function(){
      menu.mobile();
    }
  };

  $(document).ready(function() {
    menu.init();
  });
})(jQuery);