const buildTimeStamp = (isShortDate) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const D = new Date();
    const day = D.getDate();
    const m = D.getMonth();
    const month = (isShortDate ? m : months[m]);
    const year = D.getFullYear();
    const currentTime = new Date().toLocaleTimeString();
    const fullDate = (isShortDate ? `${m+1}/${day}/${year}-${currentTime}` : {'date': `${month + 1} ${day}, ${year}`, 'time': currentTime});
    
    console.log(fullDate);

    return fullDate;
}

buildTimeStamp(true);