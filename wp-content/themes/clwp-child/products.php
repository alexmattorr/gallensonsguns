<?php 
  /*
  Template Name: Products
  */
  get_header();
  $image = wp_get_attachment_image_src( get_post_thumbnail_id( $post->ID ), 'single-post-thumbnail' )[0];
?>

<section class="hero">
  <div class="column" style="background-image: url('<?= $image; ?>');">
    <div>
      <h1><?php the_title(); ?></h1>
    </div>
  </div>
</section>


<section>
  <div class="row products">
    <?php
      $amount = get_sub_field('amount_to_show');
      $query = array(
        'post_type' => 'used_guns',
        'posts_per_page' => 8,
        'order' => 'DESC',
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
</section>

<section class="bg-light-gray">
  <?php
    $title = get_field('split_section_title');
    $text = get_field('split_section_text');
    $link = get_field('split_section_link');
  ?>
  <div id="<?= $hash_title; ?>" class="row">
    <div class="column title">
      <?php if($title): ?>
        <h3><?= $title; ?></h3>
      <?php endif; ?>

      <?php if($text): ?>
        <p><?= $text; ?></p>
      <?php endif; ?>
    </div>
  </div>

  <?php if($link['url']): ?>
  <div class="row">
    <div class="column buttons">
        <a href="<?= $link['url']; ?>" target="<?= $link['target']; ?>" class="button <?= $type; ?>"><?= $link['title']; ?></a>
    </div>
  </div>
  <?php endif; ?>
</section>

<section>
  <?= do_shortcode('[ajax_load_more scroll="false" container_type="div" css_classes="row products" post_type="used_guns" orderby="menu_order" posts_per_page="8" offset="8" post__not_in=' . $post_id_list . ' transition_container="false" button_label="View More" button_loading_label="Loading"]'); ?>
</section>

<?php get_footer();
