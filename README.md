
This is a rewrite of [Tosh](http://tosh.tjvr.org/), my text-based Scratch project editor.

This version is open-source, with a readable, modern codebase.


Dependencies
============

* Project player thanks to [Nathan's Phosphorus](https://phosphorus.github.io/), as before
* Uses [Nearley](http://nearley.js.org/) for parsing. (Originally Tosh used a home-grown Earley parser for performance reasons; I've now rolled lots of perf improvements into Nearley :-))
* Uses my optimised lexer [Moo](https://github.com/no-context/moo)
* Uses [nearley-reverse](https://github.com/tjvr/nearley-reverse) for transforming Scratch AST into Tosh code (on load); this is the opposite of parsing, which happens on save/run
* Uses Nathan's [v2](https://github.com/nathan/v2) for views, model, undo, menus, etc


Current status
==============

* Load/save seems to work
* Importing / compiling scripts is there, but needs extensive testing & improvement
* Measuring scripts is fully implemented & tested (so we can "clean up" when saving to sb2) 
* Playing projects seems to work

* No sprite management
* No costume management (nor am I particularly interested in adding this!)
* Highlighting almost works
* Completion is in-progress but goodness it's a difficult problem

Future plans:

* A desktop version for Win/Mac based on my unreleased lightweight Electron clone


Running
=======

```sh
git clone --recursive https://github.com/tjvr/tosh2
cd tosh2
echo ';window.P = P' >> phosphorus/phosphorus.js
yarn
yarn grammar && yarn test
yarn start
```

<http://localhost:8080/app/>

If someone wants to set up browserify/babelify for bundling, that would be excellent

