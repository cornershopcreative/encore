<?php get_header() ?>

<?php 

$images = get_field('gallery');

if( $images ): ?>
  <ul class="gallery">
    <?php foreach( $images as $image ): ?>
      <li>
        <a href="<?php echo $image['url']; ?>">
          <img src="<?php echo $image['sizes']['gallery']; ?>" alt="<?php echo $image['alt']; ?>" />
        </a>
        <p><?php echo $image['caption']; ?></p>
      </li>
    <?php endforeach; ?>
  </ul>
<?php endif; ?>

<?php get_footer() ?>