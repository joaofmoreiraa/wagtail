from django.core.cache import cache
from django.test import TestCase, override_settings

from wagtail.contrib.redirects.tmp_storages import CacheStorage


class TestCacheStorageBug(TestCase):
    @override_settings(WAGTAIL_REDIRECTS_FILE_STORAGE="cache")
    def test_cache_storage_remove_clears_cache(self):
        storage = CacheStorage()
        test_data = b"test data"
        storage.save(test_data)

        # Verify data is in cache
        self.assertEqual(cache.get(storage.CACHE_PREFIX + storage.name), test_data)

        storage.remove()

        # Verify data is removed from cache
        self.assertIsNone(cache.get(storage.CACHE_PREFIX + storage.name))


