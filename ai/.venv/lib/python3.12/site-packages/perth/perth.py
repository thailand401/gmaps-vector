# coding:utf-8

import copy
import threading


class Perth(object):
    def __init__(self, seeds={}):
        self.__dict__['_threadlocal'] = threading.local()
        self.__dict__['_seeds'] = {}
        self._seeds.update(seeds)

    def get_seed(self, name):
        return self._seeds[name]

    def set_seed(self, name, v):
        self._seeds[name] = v

    def set_seed_f(self, f):
        self._seeds[f.__name__] = f()

    def remove_seed(self, name):
        del self._seeds[name]

    def __getattr__(self, name):
        if hasattr(self._threadlocal, name):
            return getattr(self._threadlocal, name)

        else:
            if name in self._seeds:
                obj = copy.deepcopy(self._seeds[name])
                setattr(self._threadlocal, name, obj)
                return obj

            else:
                return super(Perth, self).__getattribute__(name)

    def __setattr__(self, name, value):
        setattr(self._threadlocal, name, value)

    def __delattr__(self, name):
        delattr(self._threadlocal, name)
