<?php 
  get_header();

  global $post;
  $post_slug = $post->post_name;

  $cats = get_the_category();
  $cat_slugs = array();

  foreach($cats as $cat) {
    array_push($cat_slugs, $cat->slug);
  }

  // post fields
  $title = get_the_title();
  $logo = wp_get_attachment_image_src( get_post_thumbnail_id( $post->ID ), 'single-post-thumbnail' )[0];
  $hero = get_field('highlight_image')['sizes']['large'];
  $link = get_field('company_url');
  $sells_suppressors = get_field('sells_suppressors');
  $suppressor_link = get_field('suppressor_url');

  if(in_array('featured-brand', $cat_slugs)):
?>

<section class="hero">
    <div class="column" style="background-image: url(<?= $hero; ?>);">
      <div>

        <div>
          <h1><?= $title; ?></h1>
        </div>

        <div>
          <a href="<?= $link; ?>" class="button primary" target="_blank">View Website</a>

          <?php if($sells_suppressors === 'yes'): ?>
            <a href="<?= $suppressor_link; ?>" class="button primary" target="_blank">View Suppressors</a>
          <?php endif; ?>
        </div>

      </div>
    </div>
</section>

<?php endif; ?>

<section class="brand-info">
    <div class="row">
      <div class="column title">

        <div>
          <img src="<?= $logo; ?>" alt="<?= $title; ?>" />
        </div>

        <p><?= get_the_content(); ?></p>

        <?php if(!in_array('featured-brand', $cat_slugs)): ?>
        <div>
          <a href="<?= $link; ?>" class="button primary" target="_blank">View Website</a>

          <?php if($sells_suppressors === 'yes'): ?>
            <a href="<?= $suppressor_link; ?>" class="button primary" target="_blank">View Suppressors</a>
          <?php endif; ?>
        </div>
        <?php endif; ?>

      </div>
    </div>
</section>

<!-- Used Guns -->
<?php
  $has_products = false;
  $query = array(
    'post_type' => 'used_guns',
    'posts_per_page' => 999
  );

  $check_products = new WP_Query($query);
  while ( $check_products->have_posts() ) : $check_products->the_post();
    $terms = get_the_terms( $post->ID, 'brands' );
    $brand = $terms[0]->slug;
    if($brand === $post_slug) {
      $has_products = true;
    }
  endwhile;
  wp_reset_query();
?>
<?php if($has_products > 0): ?>
<section>
  <div class="row">
    <div class="column title">
      <h3>Used Guns</h3>
    </div>
  </div>

  <div class="row products carousel">
    <?php
      $query = array(
        'post_type' => 'used_guns',
        'posts_per_page' => 999,
        'order' => 'asc',
        'orderby' => 'date'
      );

      $loop = new WP_Query($query);
      while ( $loop->have_posts() ) : $loop->the_post();
        $terms = get_the_terms( $post->ID, 'brands' );
        $brand = $terms[0]->slug;
        if($brand === $post_slug):
    ?>
    <div class="column">
      <?php get_template_part('template-parts/part', 'product'); ?>
    </div>
    <?php 
        endif; 
      endwhile; 
      wp_reset_query(); ?>
  </div>

  <div class="row">
    <div class="column buttons">
      <a href="/used-gun-inventory" class="button">view all guns</a>
    </div>
  </div>
</section>
<?php endif; ?>

<!-- Rebates -->
<?php
  if( have_rows('rebates') ):
?>
<section>
  <div class="row">
    <div class="column title">
      <h3>Rebates</h3>
    </div>
  </div>

  <div class="row">
    <?php
      while ( have_rows('rebates') ) : the_row();
        $image = get_sub_field('rebate_image');
    ?>
    <div class="column center">
      <img src="<?= $image['sizes']['large']; ?>" alt="<?= $image['alt']; ?>">
    </div>
    <?php endwhile; ?>
  </div>
</section>
<?php
  endif;
  get_footer();
?>