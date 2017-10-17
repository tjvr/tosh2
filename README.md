


Dependencies
============

* Project player thanks to [Nathan's Phosphorus](https://phosphorus.github.io/), as before
* Uses [Nearley](http://nearley.js.org/) for parsing. (Originally Tosh used a home-grown Earley parser for performance reasons; I've now rolled lots of perf improvements into Nearley :-))
* Uses my optimised lexer [Moo](https://github.com/no-context/moo)
* Uses [nearley-reverse](https://github.com/tjvr/nearley-reverse) for transforming Scratch AST into Tosh code (on load); this is the opposite of parsing, which happens on save/run
* Uses Nathan's [v2](https://github.com/nathan/v2) for views, model, undo, menus, etc


Current status
==============

???

