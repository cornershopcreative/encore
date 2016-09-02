<?php
    global $mk_options;
    switch ($view_params['column']) {
        case 1:
            $width = $mk_options['grid_width'];
            $column_class = 'mk--col mk--col--12-12';
            break;
        case 2:
            $width = round($mk_options['grid_width'] / 2);
            $column_class = 'mk--col mk--col--6-12';
            break;
        case 3:
            $width = round($mk_options['grid_width'] / 3);
            $column_class = 'mk--col mk--col--4-12';
            break;
        case 4:
            $width = round($mk_options['grid_width'] / 4);
            $column_class = 'mk--col mk--col--3-12';
            break;
    }
    
    
    if($view_params['image_size'] == 'crop') {
        $image_src_array = wp_get_attachment_image_src(get_post_thumbnail_id(), 'full', true);
        $image_output_src = mk_image_generator($image_src_array[0], $width * $view_params['image_quality'], $view_params['height'] * $view_params['image_quality'], 'true');
    } else {
        $image_src_array = wp_get_attachment_image_src(get_post_thumbnail_id(), $view_params['image_size'], true);
        $image_output_src = $image_src_array[0];
    }

    $images = explode(',', get_post_meta(get_the_ID() , '_gallery_images', true));
    
    foreach ($images as $image) {
        $image_src[] = wp_get_attachment_image_src($image, 'full', true)[0];
    }

    $json_image = json_encode( $image_src );

    /* Dynamic class names to be added to article tag. */
    $item_classes[] = implode(' ', mk_get_custom_tax(get_the_id(), 'photo_album', false, true));
    /* ---- */

    
?>

<article id="<?php the_ID(); ?>" class="mk-album-item mk-album-grid-item <?php echo $column_class?> <?php echo implode(' ', $item_classes); ?>"  >
    <figure>
        <img alt="<?php the_title(); ?>" title="<?php the_title(); ?>" class="album-cover-image" src="<?php echo $image_output_src; ?>" width="<?php echo $width; ?>" height="<?php echo $view_params['height']; ?>"  />
        <?php if( $view_params['overlay_preview'] == 'true' ): ?>
        <div class="overlay anim-<?php echo $view_params['overlay_hover_animation'] ?>"></div>
        <?php endif; ?>
        <figcaption>
            <?php if( $view_params['thumbnail_preview'] == 'true' ): ?>
            <span class="album-sneak-peak <?php echo $view_params['thumbnail_shape']; ?>">
                <?php
                    echo mk_get_shortcode_view('mk_photo_album', 'components/sneak-peak', true, ['images' => $images, 'style' => $view_params['thumbnail_shape']]);
                ?>
            </span>
            <?php endif; ?>
            <div class="item-meta <?php echo $view_params['title_preview_style']; ?> anim-<?php echo $view_params['title_animation']; ?>">
                <?php 
                    echo mk_get_shortcode_view('mk_photo_album', 'components/title', true);
                    if ( $view_params['description_preview'] == 'true' ) {
                        echo mk_get_shortcode_view('mk_photo_album', 'components/description', true);
                    }
                    // echo mk_get_shortcode_view('mk_photo_album', 'components/meta', true);    
                ?>        
            </div><!-- item meta -->
        </figcaption>
        <a  href="<?php echo $image_src_array[0]; ?>" class="mk-album-link js-el"
            data-mk-component="PhotoAlbum"
            data-photoalbum-images='<?php echo $json_image ?>'
            data-photoalbum-title="<?php the_title(); ?>"
            data-photoalbum-id="<?php the_ID(); ?>" 
            data-photoalbum-url="<?php echo $view_params['album_url']; ?>" >
        </a>
    </figure><!-- Featured Image -->
</article><!-- Item Holder -->