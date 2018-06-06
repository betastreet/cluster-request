const ClusterRequest = require('./index');
const clusterRequest = new ClusterRequest();

describe('Testing Requests', () => {

    beforeAll(() => {
        jest.mock('request');
    });

    it('should handle valid requests', () =>
        clusterRequest.request('geos-api', '', {}, {})
            .then(res => {
                expect(res.body).toMatchObject({ data: [{geo_id: '100'}] });
                expect(res.statusCode).toBe(200);
            })
            .catch(err => { throw err; })
    );

    it('should handle errored requests', () =>
        clusterRequest.request('verticals-api', '', {}, {})
            .then(err => { throw err; })
            .catch(err => {
                expect(err.message).toBe('ADVERTISER_NOT_FOUND (404)');
                expect(err.statusCode).toBe(404);
                expect(err.body.message).toBe('ADVERTISER_NOT_FOUND');
            })
    );

    it('should handle errored requests', () =>
        clusterRequest.request('badjson:443', '', {}, {})
            .then(err => { throw err; })
            .catch(err => {
                expect(err.message).toBe('Can\'t parse json: bad json');
                expect(err.statusCode).toBe(undefined);
            })
    );
});
