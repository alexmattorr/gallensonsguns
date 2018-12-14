<?php
  $text = get_sub_field('text');
?>
<div class="row">
  <div class="column title">
    <?php if($text): ?>
      <p><?= $text; ?></p>
    <?php endif; ?>
  </div>
</div>