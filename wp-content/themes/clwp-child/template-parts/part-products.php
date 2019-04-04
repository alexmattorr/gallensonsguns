<div class="products">
  <?php
    $amount = get_sub_field('amount_to_show');
    $query = array(
      'post_type' => 'used_guns',
      'posts_per_page' => 9,
      'order' => 'DESC',
      'orderby' => 'date',
    );

    $loop = new WP_Query($query);
    while ( $loop->have_posts() ) : $loop->the_post();
  ?>

  <div class="column">
    <?php get_template_part('template-parts/part', 'product'); ?>
  </div>

  <?php 
    endwhile; 
    wp_reset_query();

    echo do_shortcode('[ajax_load_more scroll="false" container_type="div" css_classes="products" post_type="used_guns" orderby="menu_order" posts_per_page="9" offset="9" post__not_in=' . $post_id_list . ' transition_container="false" button_label="View More" button_loading_label="Loading"]');
?>
</div>

