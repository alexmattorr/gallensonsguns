<?php
  $title = get_sub_field('title');
  $hash_title = str_replace(' ', '-', strtolower($title));
  $text = get_sub_field('text');
?>
<div class="row">
  <div id="<?= $hash_title; ?>" class="invisible-anchor"></div>
  <div class="column title">
    <?php if($title): ?>
      <h3><?= $title; ?></h3>
    <?php endif; ?>

    <?php if($text): ?>
      <p><?= $text; ?></p>
    <?php endif; ?>
  </div>
</div>