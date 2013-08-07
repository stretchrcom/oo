/*

  oo
  v1.0
  
  The worlds simplest JavaScript OO implementation.
  For if you just need classes, and nothing else.

  Copyright (c) 2013 Mat Ryer
  Please consider promoting this project if you find it useful.
  Be sure to check out the Licence: https://github.com/stretchrcom/oo#licence

  ---

  Usage:

      var SayHelloClass = oo.Class("SayHelloClass", {
      
        init: function(name) {
          this.name = name;
        },

        sayHello: function() {
          alert("Hello " + this.name);
        }

      });

      var helloToMat = new SayHelloClass("Mat");
      helloToMat.sayHello();

*/

// ooreset makes the initial oo object.
//
// This can be useful for testing:
//
//     oo = ooreset();
//
var ooreset = function() {
  var oo = {

    // the oo version number
    version: "1.2",

    // oo.classes holds an array of all known class names.
    classes: [],

    // classesmap holds a map of the class name to the object.
    classesmap: {},

    /*
      oo.Class defines a new class.

      USAGE:
      oo.Class(className, [base-class,] [mix-ins...,] definition)

      className = A string name of the class.
      base-class = (optional) Another oo.Class from which to inherit.
      mix-ins = (optional) None or many other things to mix in.
      definition = The definition of the class.
    */
    Class: function(className) {

      // <debug>
      // ensure this is a unique class name
      if (oo.classesmap[className]) {
        throw new oo.DuplicateClassNameException(className);
        return null;
      }
      // </debug>

      // make the class thing
      var klass = function(){

        if (!this.$initialiseBases) {
          throw new oo.IncorrectSyntaxException(className);
        }

        // initialise bases
        this.$initialiseBases.apply(this);

        // call the constructor
        this.init.apply(this, arguments);

      };

      // default constructor
      klass.prototype.init = function(){};

      // keep track of base classes
      klass.$bases = {};

      // initialiseBases ensures all base methods are bound to
      // the correct context to allow the myInstance.BaseClass.baseMethod() format.
      klass.prototype.$initialiseBases = function(){
        for (var baseName in this.$class.$bases) {
          var basePrototype = this.$class.$bases[baseName];
          for (var baseProperty in basePrototype.prototype) {
            if (typeof basePrototype.prototype[baseProperty] == "function") {
              if (baseProperty.substr(0, 1) != "$") {
                basePrototype.prototype[baseProperty] = basePrototype.prototype[baseProperty].bind(this);
              }
            }
          }
        }

      };

      var afterClassDefinedList = [];

      // handle bass classes and mixins
      for (var i = 1, l = arguments.length - 1; i < l; i++) {

        var item = arguments[i];

        // handle $beforeInherited method
        if (item.$beforeInherited) {
          item = item.$beforeInherited(klass, arguments);
        }

        // skip if we have nothing
        if (!item) continue;

        // is this a base class?
        if (item.$isClass) {
          
          // add it to the bases
          klass.$bases[item.$className] = item;

          // write the base properties by default
          ooextend(item.prototype, klass.prototype);

          // save the class.BaseClass object
          klass.prototype[item.$className] = item.prototype;

        } else if (typeof item == "object") {

          // mix in

          ooextend(item, klass.prototype);

        }

        // handle the $afterInherited method
        if (item.$afterInherited) {
          item.$afterInherited(klass, arguments);
        }

        // handle the $afterInherited method
        if (item.$afterClassDefined) {
          afterClassDefinedList.push(item.$afterClassDefined.bind(item, klass, arguments))
        }

      }

      // setup the definition
      if (arguments.length > 1) {

        var definition = arguments[arguments.length-1];
        for (var property in definition) {

          // get the property
          var theProperty = definition[property];

          // is this an oo.Event?
          if (theProperty && oo.Event && theProperty.$class == oo.Event) {

            oo.Event.$configure(property, klass.prototype);

          } else {

            // is this a class or instance item?
            if (property.substr(0, 1) === "$") {

              klass[property] = theProperty;

            } else {

              klass.prototype[property] = theProperty;

            }

          }

        }

      }

      // set a nice toString for lovely debugging
      klass.toString = function(){ return "<{ oo.Class: " + this.$className + " }>"; };

      // this is an OO class
      klass.$isClass = true;

      // save the constructor and 'kind' property
      klass.prototype.constructor = klass.prototype.$class = klass;

      // set the class name
      oo.classes[oo.classes.length] = klass.$className = className;

      // add the class to the classmap 
      oo.classesmap[className] = klass;

      // call any $afterClassDefined functions
      if (afterClassDefinedList.length > 0) {
        for (var i in afterClassDefinedList) {
          afterClassDefinedList[i]();
        }
      }

      // and return the class
      return klass;

    }

  };

  /*
    oo Events
  */
  oo.Event = oo.Class("oo.Event", {

    // configure sets up the appropriate event methods
    // on the target object.
    $configure: function(name, target) {

      // method to add callback
      var onFunc = function(target, func) {
        target.callbacks = target.callbacks || [];
        target.callbacks.push(func);
      };

      // method to fire callbacks
      var fireFunc = function(target) {
        if (target[name].callbacks) {

          // build argument list
          var args = [];
          for (var argi in arguments) {
            if (argi > 0) {
              args.push(arguments[argi]);
            }
          }

          for (var func in target[name].callbacks) {
            target[name].callbacks[func].apply(target, args);
          }

        }
      };

      // obj.eventName() fires the event
      target[name] = function(){

        // add the target (this) object as the first argument
        var args = [this];
        ooextend(arguments, args);
        fireFunc.apply(null, args);
        return this;

      };

      // on adds a callback
      target[name].on = function(){

        var args = [this];
        ooextend(arguments, args);
        onFunc.apply(null, args);
        return this;

      };

      // remove removes a callback
      target[name].remove = function(callback) {

        // TODO:

      }

    }

  });

  /*
    oo Exceptions
  */

  // oo.Exception is the root exception class.
  oo.Exception = oo.Class("oo.Exception", {
    init: function(message){
      this.message = message;
    },
    toString: function(){
      return "oo.Exception: \" + message + \"";
    }
  });

  // DuplicateClassNameException 
  oo.DuplicateClassNameException = oo.Class("oo.DuplicateClassNameException", oo.Exception, {
    init: function(className) {
      this["oo.Exception"].init("Cannot define a class because '" + className + "' already exists, consider namespacing your class names; e.g. YourCompany." + className);
    }
  });

  // IncorrectSyntaxException
  oo.IncorrectSyntaxException = oo.Class("oo.IncorrectSyntaxException", oo.Exception, {
    init: function(className) {
      this["oo.Exception"].init("Incorrect syntax when creating a new instance; don't just call the method, use the new keyword: var obj = new " + className + "();");
    }
  });

  return oo;
};

// ooextend simply copies properties from source into
// destiantion.
var ooextend = function(source, destination) {

  // is this an array?
  if (typeof source.length != "undefined" && typeof destination.length != "undefined") {
    // array
    for (var s in source) {
      destination.push(source[s]);
    }
  } else {
    // objects
    for (var s in source) {
      destination[s] = source[s];
    }
  }

};

// setup the initial oo object
var oo = ooreset();

/*
 *  oobind
 *  Binds context and arguments to a function
 *
 *  oobind(function, context [, argument1 [, argument2]]);
 *  or
 *  function.bind(function, context [, argument1 [, argument2]]);
 */
var oobind = function() {

        var 
        
                _func = arguments[0] || null,
                _obj = arguments[1] || this,
                _args = [],
                
                i = 2, 
                l = arguments.length,
                
                bound
                
        ;
        
        // add arguments
        for (; i<l; i++) {
                _args.push(arguments[i]);
        }
        
        // return a new function that wraps everything up
        bound = function() {
                
                // start an array to get the args
                var theArgs = [];
                var i = 0;

                // add every argument from _args
                for (i = 0, l = _args.length; i < l; i++) {
                        theArgs.push(_args[i]);
                }
                
                // add any real arguments passed
                for (i = 0, l = arguments.length; i < l; i++) {
                        theArgs.push(arguments[i]);
                }

                // call the function with the specified context and arguments
                return _func.apply(_obj, theArgs);

        };
        
        bound.func = _func;
        bound.context = _obj;
        bound.args = _args;
        
        return bound;
        
};

/*
 *  instance shortcut version...
 */
Function.prototype.bind = function(){
        
        var theArgs = [], i = 0, l = arguments.length;
        
        // add the function
        theArgs.push(this);
        
        // add any real arguments passed
        for (; i < l; i++) {
                theArgs.push(arguments[i]);
        }
        
        return oobind.apply(window, theArgs);
        
};