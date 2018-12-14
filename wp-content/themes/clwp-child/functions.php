<?php

// Require Scripts and Styles
require 'library/enqueue-scripts.php';

function cc_mime_types($mimes) {
  $mimes['svg'] = 'image/svg+xml';
  return $mimes;
}
add_filter('upload_mimes', 'cc_mime_types');

function remove_menus(){
  remove_menu_page( 'edit-comments.php' );
  // remove_menu_page( 'themes.php' );
  
}
add_action( 'admin_menu', 'remove_menus' );

?>