-- Create the database if it does not exist already
CREATE DATABASE IF NOT EXISTS `db0` DEFAULT CHARACTER SET latin1 COLLATE latin1_swedish_ci;

-- Use the database provided
USE `db0`;

-- Create the Strings Table
CREATE TABLE `strings` (
  `id` bigint(11) NOT NULL, -- Number
  `str` varchar(1000) NOT NULL -- String
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
