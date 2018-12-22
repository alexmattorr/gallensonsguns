(function($){
  var fixed = {
    header : function() {
      var header = $('header.header-bottom'),
          offset = header.offset().top,
          fixed = 'is-fixed';

      $(window).scroll(function(){
        var scroll = $(window).scrollTop();
      
        if (scroll >= offset) {
          header.addClass(fixed);
        } else {
          header.removeClass(fixed);
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