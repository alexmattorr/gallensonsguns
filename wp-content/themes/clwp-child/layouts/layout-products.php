<div class="row products carousel">
  <?php
    $amount = get_sub_field('amount_to_show');
    $query = array(
      'post_type' => 'used_guns',
      'posts_per_page' => $amount,
      'order' => 'asc',
      'orderby' => 'date',
    );

    $loop = new WP_Query($query);
    while ( $loop->have_posts() ) : $loop->the_post();
  ?>
  <div class="column">
    <?php get_template_part('template-parts/part', 'product'); ?>
  </div>
  <?php endwhile; wp_reset_query(); ?>
</div>