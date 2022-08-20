# FireWyrm message protocol

FireWyrm messages are structured as Arrays.  Note that the colonyId will usually just be 0.

`cmdId` should be unique for any currently outstanding command; the response will be sent with a matching cmdId to allow it to be mapped back to the original command.

## Supported argument types

These types are permitted as arguments or return values for any property or function
  * int
  * double
  * bool
  * null
  * string
  * binary Data (in the format {"$type": "binary", "data": "BASE64 STRING"})
  * object reference (in the format { "$type": "ref", "data": [spawn_id, object_id] } )
  * json data by value
    * By default, all javascript objects are passed by reference
    * If desired to pass by value (much more efficient for passing large amounts of data) then this type is used
    * In the format {"$type": "json", "data": mixed} where the "mixed" value is used without any transformation (no looking through for special types, no references, etc)
  * error data (in the format {"$type": "error", "data": "message"})

## Scoping

Everything is scoped to a colonyId

* spawn_id: each spawn_id is unique inside a given colony
* object_id: each object_id is unique to a specific spawn / instance of the plugin

## Messages

  Arg1 - Command name

## Response

Arg1 - Response status
- `"error"`
- `"success"`

## Specific Messages

These are the specific message types

### New / Instantiate
Message : `["New", "application/x-somepluginmimetype", {}]`
* spawn a new instance.
* first parameter is the mimetype; must be specified
* second parameter are the key/value parameters (analogous to the param tags in an object tag)
  * This must be provided but can be empty

Response: `["success", id]`
* where id is a numeric (int32) identifier for the created spawn

### Destroy / destruct

Message : `["Destroy", [id]]`
* destroy existing spawn

Response: `["success", id]`
* where id is the numeric (int32) identifier for the spawn that was destroyed

### Enumerate object properties / members

Message : `["Enum", spawn_id, object_id]`
- Enumerates the member names of a given object
- spawn_id matches an identifier returned by NewI which has not been destroyed
- object_id matches a known and live object, including 0 which is the "default" or root object for the spawn
  
Response: `["success", ["list", "of", "members", "here"]]`
- The return value is an array of strings corresponding to known members
- There could be other members that work but are not known to FireBreath; they will not be listed

Alternate Response: `["error", {"error": "invalid object", "message": "The object does not exist"}]`

### Invoke method

Message : `["Invoke", spawn_id, object_id, "funcName", (Array)[arg1, arg2, arg3]]`
- Invoke method funcName on a given object
- spawn_id matches an identifier returned by NewI which has not been destroyed
- object_id matches a known and live object, including 0 which is the "default" or root object for the spawn
- The argument array may be empty but must be provided
- if "funcName" is "" (empty string) then the object will be invoked as a function

Response: `["success", retVal]`

- retVal can be any supported argument type
Alternate Response: ["error", {"error": "error type", "message": "specific error message"}]
- For example, if "" is the function name but the object is not invokable, you will get:
  > `["error", {"error": "could not invoke", "message": "The object is not invokable"}]`

### Get property value

Message : `["GetP", spawn_id, object_id, "propName"]`
- Get the named property for the given object
- spawn_id matches an identifier returned by NewI which has not been destroyed
- object_id matches a known and live object, including 0 which is the "default" or root object for the spawn
- If "propName" is "" this will resolve to itself, returning its own object_id

Response: `["success", retVal]`
- retVal can be any supported argument type
Alternate Response: ["error", {"error": "error type", "message": "specific error message"}]
- For example, if the argument name does not exist and is not valid, you will get:
  > `["error", {"error": "could not get property", "message": "Property does not exist on this object"}]`

### Set property value

Message : `["SetP", spawn_id, object_id, "propName", value]`
- Set the named property for the given object
- spawn_id matches an identifier returned by NewI which has not been destroyed
- object_id matches a known and live object, including 0 which is the "default" or root object for the spawn
- If "propName" is "" this will return an error

Response: `["success", null]`

- There is no return value for this call
Alternate Response: ["error", {"error": "error type", "message": "specific error message"}]
- For example, if the argument name does not exist and is not valid, you will get: 
  > `["error", {"error": "could not set property", "message": "Property does not exist on this object"}]`

### Delete property value

Message : `["DelP", spawn_id, object_id, "propName"]`
- Delete the named property from the given object
- spawn_id matches an identifier returned by NewI which has not been destroyed
- object_id matches a known and live object, including 0 which is the "default" or root object for the spawn
- If "propName" is "" this will return an error
  
Response: `["success", null]`

- There is no return value for this call
Alternate Response: `["error", {"error": "error type", "message": "specific error message"}]`
- For example, if the argument name does not exist and is not valid, you will get: 
  > `["error", {"error": "could not set property", "message": "Property does not exist on this object"}]`

### Releasing objects

IMPORTANT!
Any objects returned *must* be released or memory leaks will result

Message : `["RelObj", spawn_id, object_id]`
- Releases the specified object (so it can be freed)
- spawn_id matches an identifier returned by NewI which has not been destroyed
- object_id matches a known and live object, including 0 which is the "default" or root object for the spawn

Response: `["success", null]`
- There is no return value for this call

Alternate Response: `["error", {"error": "error type", "message": "specific error message"}]`
- For example, if the object is invalid or has already been released, you will get:
  > `["error", {"error": "invalid", "message": "The object does not exist"}]`

## Browser messages

Browser-only messages:
- These are messages which are only supported by FireWyrm colonies which live in a browser
  In other words, they work from plugin -> browser but not browser -> plugin

  NOTE: These probably should be moved to the root interface of an object type

### Eval string (deprecated because browsers really don't want to allow it)

Message : `["Eval", jsString]`
- jsString is a valid string of javascript to evaluate
- ability to evaluate the string depends on browser support

Response: `["success", retVal]`
- retVal can be any supported argument type

Alternate Response: `["error", {"error": "exception thrown", "message": "message from thrown exception", "stack": "call stack if any"}]`

Alternate Response: `["error", {"error": "not supported", "message": "eval not supported"}]`

### Read array

Message : `["readArray", spawn_id, object_id]`
- Requests all values of an object which is assumed to be an array
- spawn_id matches an identifier returned by NewI which has not been destroyed
- object_id matches a known and live object, including 0 which is the "default" or root object for the spawn

Response: `["success", [array, values, here]]`
- each value of the array can be any supported argument type
- this is a shorthand for getting length and then requesting each value individually
- will only succeed if there is a "length" property on the object and obj[0..length] exists

Alternate Response: `["error", {"error": "invalid type", "message": "object is not an array"]`

### Read object

Message : `["readObject", spawn_id, object_id]`
- Requests a key : value map of the object
- spawn_id matches an identifier returned by NewI which has not been destroyed
- object_id matches a known and live object, including 0 which is the "default" or root object for the spawn

Response: `["success", {"key1": "value1", "key2": "value2"}]`
- all keys must be strings, values can be any supported argument type
- this is a shorthand for enumerating the keys on the object and then requesting each value

Alternate Response: `["error", {"error": "invalid", "message": "The object does not exist"}]`