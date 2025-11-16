async function waitFor(timeout = 30000){
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, timeout);
    });
}   

export default waitFor;