<?php
/**
 * Customize the output of menus for Foundation top bar
 */
if ( ! class_exists( 'CLWP_Top_Bar_Walker' ) ) :
	class CLWP_Top_Bar_Walker extends Walker_Nav_Menu {
		function start_lvl( &$output, $depth = 0, $args = array() ) {
			$indent = str_repeat("\t", $depth);
			$output .= "\n$indent<ul class=\"dropdown menu vertical\" data-toggle>\n";
		}
	}
endif;
