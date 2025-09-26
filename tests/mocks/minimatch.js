export function minimatch() {
  return true;
}

export function filter() {
  return () => true;
}

minimatch.filter = filter;

export default minimatch;
