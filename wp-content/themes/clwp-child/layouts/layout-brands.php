<div class="row">
  <?php
    $amount = get_sub_field('amount_to_show');
    $suppressor_brands = get_sub_field('show_suppressor_brands');

    $query = array(
      'post_type' => 'brands',
      'posts_per_page' => $amount,
      'order' => 'asc',
      'orderby' => 'title',
    );

    $loop = new WP_Query($query);

    if($suppressor_brands === 'true') {
      while ( $loop->have_posts() ) : $loop->the_post();
        $image = wp_get_attachment_image_src( get_post_thumbnail_id( $post->ID ), 'single-post-thumbnail' )[0];
        $title = get_the_title();
        $link = get_field('company_url');
        $suppressors = get_field('sells_suppressors');
        $suppressor_url = get_field('suppressor_url');

        if($suppressor_url) {
          $link = $suppressor_url;
        }

        if($suppressors === 'yes'):
  ?>
  <div class="column small-6 medium-3 icon-item">
    <a href="<?= $link; ?>" target="_blank">
      <img src="<?= $image; ?>" alt="<?= $title; ?> Logo">
    </a>
  </div>
  <?php
        endif;
      endwhile;
      wp_reset_query();
    } else {
      
      while ( $loop->have_posts() ) : $loop->the_post();
        $image = wp_get_attachment_image_src( get_post_thumbnail_id( $post->ID ), 'single-post-thumbnail' )[0];
        $title = get_the_title();
        $link = get_field('company_url');
  ?>    
  <div class="column small-6 medium-3 icon-item">
    <a href="<?= $link; ?>" target="_blank">
      <img src="<?= $image; ?>" alt="<?= $title; ?> Logo">
    </a>
  </div>
  <?php
      endwhile;
      wp_reset_query();
    }
  ?>
</div>