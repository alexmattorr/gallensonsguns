(function($){
  var fixed = {
    header : function() {
      var container = $('.max-container'),
          header = $('header.header-bottom'),
          offset = header.offset().top,
          fixed = 'header-fixed';

      $(window).scroll(function(){
        var scroll = $(window).scrollTop();
      
        if (scroll >= offset) {
          header.addClass(fixed);
          container.addClass(fixed);
        } else {
          header.removeClass(fixed);
          container.removeClass(fixed);
        }
      });
    },

    init : function(){
      fixed.header();
    }
  };

  $(document).ready(function() {
    fixed.init();
  });
})(jQuery);