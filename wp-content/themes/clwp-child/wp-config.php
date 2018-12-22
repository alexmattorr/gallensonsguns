<?php
/**
 * The base configuration for WordPress
 *
 * The wp-config.php creation script uses this file during the
 * installation. You don't have to use the web site, you can
 * copy this file to "wp-config.php" and fill in the values.
 *
 * This file contains the following configurations:
 *
 * * MySQL settings
 * * Secret keys
 * * Database table prefix
 * * ABSPATH
 *
 * @link https://codex.wordpress.org/Editing_wp-config.php
 *
 * @package WordPress
 */

// ** MySQL settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define('DB_NAME', 'gallensonsguns');

/** MySQL database username */
define('DB_USER', 'root');

/** MySQL database password */
define('DB_PASSWORD', 'root');

/** MySQL hostname */
define('DB_HOST', 'localhost');

/** Database Charset to use in creating database tables. */
define('DB_CHARSET', 'utf8mb4');

/** The Database Collate type. Don't change this if in doubt. */
define('DB_COLLATE', '');

/**#@+
 * Authentication Unique Keys and Salts.
 *
 * Change these to different unique phrases!
 * You can generate these using the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}
 * You can change these at any point in time to invalidate all existing cookies. This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define('AUTH_KEY',         'wQ5(|w:yI`L=U`>(wyB.eN JV*C#*{D+@h7D?8Qz9t,3Gj3De(1)ppn/*]0|F/TD');
define('SECURE_AUTH_KEY',  '+=i!:d61k1}[Y%!8F./!S5j?,_{hGDJEAKcZfO[P|A5z)66<}D3o+>m@3If,yY`k');
define('LOGGED_IN_KEY',    '[yI$b,Qvzg*-AxbGbYj>7a*JjSFM7@%OZhZ42q 2tiJne~ZxXy.!28gskCP5w}eO');
define('NONCE_KEY',        'IJHg/Rv^(TW[a9 UHl%)A2Hpq,Duv[p*I;~jC-]pu&BnN1{XLNo[FAn|Q/([>8t&');
define('AUTH_SALT',        '/L:c]H(L?/ZO#%]B`Feo(RA[z2BMe</6 k{rL{kz|TIB8QNiHat.1-#~H/OV[c9b');
define('SECURE_AUTH_SALT', '(-p!A`@DA;PiRUlytH*Hxfa$/.vt|FB{nufM 5_n(blN^O*{tpzhUH+=3X)2/7*&');
define('LOGGED_IN_SALT',   '3S{;c68M=L/i3a3nWb~R3F<A4+-=Dr )E,ZCJ1g#7?AHHQZq64:8U^<SQ;Lpog*T');
define('NONCE_SALT',       '%a4ug#? O4qGw8S:]DRPWPjHvgScqc%I?>nOs=a3|cPA|9wBv))/yY 5xW!OlcP7');

/**#@-*/

/**
 * WordPress Database Table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix. Only numbers, letters, and underscores please!
 */
$table_prefix  = 'wp_';

/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 *
 * For information on other constants that can be used for debugging,
 * visit the Codex.
 *
 * @link https://codex.wordpress.org/Debugging_in_WordPress
 */
define('WP_DEBUG', false);

/* That's all, stop editing! Happy blogging. */

/** Absolute path to the WordPress directory. */
if ( !defined('ABSPATH') )
	define('ABSPATH', dirname(__FILE__) . '/');

/** Sets up WordPress vars and included files. */
require_once(ABSPATH . 'wp-settings.php');
