<div class="row">
  <?php
    if( have_rows('block') ):
      while ( have_rows('block') ) : the_row();
        $link = get_sub_field('link');
        $image = get_sub_field('image')['sizes']['large'];
        $title = get_sub_field('title');
  ?>
  <div class="column small-12 medium-4">
    <a href="<?= $link['url']; ?>" target="<?= $link['target']; ?>" class="block" style="background-image: url('<?= $image; ?>');">
      <span><?= $title; ?></span>
    </a>
  </div>
  <?php
      endwhile;
    endif;
  ?>
</div>