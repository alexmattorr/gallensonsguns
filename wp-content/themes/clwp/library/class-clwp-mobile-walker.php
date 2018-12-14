<?php
/**
 * Customize the output of menus for Foundation mobile walker
 */

if ( ! class_exists( 'CLWP_Mobile_Walker' ) ) :
	class CLWP_Mobile_Walker extends Walker_Nav_Menu {
		function start_lvl( &$output, $depth = 0, $args = array() ) {
			$indent = str_repeat("\t", $depth);
			$output .= "\n$indent<ul class=\"vertical nested menu\">\n";
		}
	}
endif;
