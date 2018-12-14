<div class="column">
   <?php
   $image = wp_get_attachment_image_src( get_post_thumbnail_id( $post->ID ), 'single-post-thumbnail' )[0];
   $title = get_the_title();
   $price = get_field('price');
   $cal = get_field('caliber');
   $tel = '801-328-2016';
   ?>
   <a href="tel:<?= $tel; ?>" class="product">
   <figure style="background-image: url('<?= $image; ?>');"></figure>
   <div class="product-text">
      <h6><?= $title; ?></h6>
      <p class="product-small">(<?= $cal; ?>)</p>
      <p class="product-price">$<?= $price; ?></p>
   </div>
   <span class="product-button">Call To Reserve</span>
   </a>
</div>