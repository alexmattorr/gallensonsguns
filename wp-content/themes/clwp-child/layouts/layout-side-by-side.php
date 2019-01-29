<div class="row side-by-sides">
  <?php
    if( have_rows('side_by_side') ):
      while ( have_rows('side_by_side') ) : the_row();
        $image = get_sub_field('image');
        $title = get_sub_field('title');
        $text = get_sub_field('text');
        $link = get_sub_field('link');

        $hash_title = str_replace(' ', '-', strtolower($title));
  ?>
  <div class="row side-by-side">
    <div class="column small-12 medium-6" style="background-image: url('<?= $image['url']; ?>');"></div>
    <div class="column small-12 medium-6">
      <div>
        <div id="<?= $hash_title; ?>" class="invisible-anchor"></div>
        <?php if($title): ?>
          <h4><?= $title; ?></h4>
        <?php endif; ?>

        <?php if($text): ?>
          <?= $text; ?>
        <?php endif; ?>

        <?php if($link): ?>
          <a href="<?= $link['url']; ?>" target="<?= $link['target']; ?>"><?= $link['title']; ?></a>
        <?php endif; ?>

      </div>
    </div>
  </div>
  <?php
      endwhile;
    endif;
  ?>
</div>