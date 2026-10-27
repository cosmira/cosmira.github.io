<?php

use Cosmira\Soda\Config\Soda;
use Cosmira\Soda\Rules\Complexity\NoUnneededTernary;

return Soda::configure()
    ->withPaths(['src/'])
    ->with([
        new NoUnneededTernary,
    ]);
