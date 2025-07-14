class PeerService{
    constructor(){
        this.localStream=null;
        this.trackAdded=false;

        if(!this.peer){
            this.peer = new RTCPeerConnection({
                iceServers: [
                    {
                        urls: [
                            "stun:stun.l.google.com:19302",
                            "stun:global.stun.twilio.com:3478",
                        ],
                    },
                ],
            });
        }
    }
    addTracks(stream){
        if(!this.trackAdded){
            this.localStream=stream;

            this.localStream.getTracks().forEach((track)=>{
                this.peer.addTrack(track,this.localStream);
            })
            this.trackAdded = true;
        }
    }

    async getOffer(){
        if(this.peer){
            const offer=await this.peer.createOffer();
            await this.peer.setLocalDescription(new RTCSessionDescription(offer));
            return offer;

        }
    }
    async getAnswer(offer){
        if(this.peer){
            await this.peer.setRemoteDescription(offer);
            const answer=await this.peer.createAnswer();
            await this.peer.setLocalDescription(new RTCSessionDescription(answer));
            return answer;    
        }
    }
     async setLocalDescription(ans) {
        if (this.peer) {
            await this.peer.setLocalDescription(new RTCSessionDescription(ans));
        }
    }

    async setRemoteDescription(ans) {
        if (this.peer) {
            await this.peer.setRemoteDescription(new RTCSessionDescription(ans));
        }
    }

}

export default PeerService;