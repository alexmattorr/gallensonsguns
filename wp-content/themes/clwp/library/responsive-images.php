<?php
/**
 * Configure responsive images sizes
 */

// Add featured image sizes
//
// Sizes are optimized and cropped for landscape aspect ratio
// and optimized for HiDPI displays on 'small' and 'medium' screen sizes.
// add_image_size( 'featured-small', 640, 200, true ); // name, width, height, crop
// add_image_size( 'featured-medium', 1280, 400, true );
// add_image_size( 'featured-large', 1440, 400, true );
// add_image_size( 'featured-xlarge', 1920, 400, true );

// Register the new image sizes for use in the add media modal in wp-admin
function clwp_custom_sizes( $sizes ) {
	return array_merge( $sizes, array(
		'clwp-small'  => __( 'CLWP Small' ),
		'clwp-medium' => __( 'CLWP Medium' ),
		'clwp-large'  => __( 'CLWP Large' ),
		'clwp-xlarge'  => __( 'CLWP XLarge' ),
	) );
}
add_filter( 'image_size_names_choose', 'clwp_custom_sizes' );

// Remove inline width and height attributes for post thumbnails
function remove_thumbnail_dimensions( $html, $post_id, $post_image_id ) {
	$html = preg_replace( '/(width|height)=\"\d*\"\s/', '', $html );
	return $html;
}
add_filter( 'post_thumbnail_html', 'remove_thumbnail_dimensions', 10, 3 );
