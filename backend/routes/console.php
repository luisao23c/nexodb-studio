<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('about-nexodb', function () {
    $this->info('NexoDB Studio');
});
