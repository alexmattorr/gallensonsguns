<div class="row">
<?php 
  $btn_count = count(get_sub_field('buttons'));
  if( have_rows('buttons') ): 
?>
  <div class="column buttons <?php if($btn_count > 1) { echo 'two'; } ?>">
    <?php
      while ( have_rows('buttons') ) : the_row();
        $link = get_sub_field('link');
        $type = get_sub_field('type');
    ?>
      <a href="<?= $link['url']; ?>" target="<?= $link['target']; ?>" class="button <?= $type; ?>"><?= $link['title']; ?></a>
    <?php endwhile; ?>
  </div>
<?php endif; ?>
</div>
