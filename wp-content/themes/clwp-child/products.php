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


<section class="products-wrapper">
  <?php 
    get_template_part('template-parts/part', 'sidebar');
    get_template_part('template-parts/part', 'products');
  ?>
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

<?php get_footer();
