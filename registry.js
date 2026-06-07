const ctuMemory = new Map();


function setMemory(node , value) {
    ctuMemory.set(node.id, value);
}


function getMemory(node) {
    return ctuMemory.get(node.id);
}


module.exports  = {
    setMemory,
    getMemory
}