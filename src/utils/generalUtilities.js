export const sanitizeDBObject = (object, fieldsToRemove) => {
  const objectCopy = object.toObject ? object.toObject() : { ...object }
  fieldsToRemove.forEach(key => delete objectCopy[key])
  return objectCopy
}
